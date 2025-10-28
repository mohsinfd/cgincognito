/**
 * POST /api/parser-llm/compare
 * Compare LLM parser vs BoostScore for A/B testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLLMParser } from '@/lib/parser-llm';
import type { BoostScoreUploadPayload } from '@/types/boostscore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90; // 90 seconds for both parsers

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const payloadStr = formData.get('payload') as string;

    if (!file || !payloadStr) {
      return NextResponse.json(
        { error: 'Missing file or payload' },
        { status: 400 }
      );
    }

    const payload: BoostScoreUploadPayload = JSON.parse(payloadStr);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`🔬 Comparison Test: ${file.name}`);
    console.log(`   Bank: ${payload.bank}`);

    // Parse with both systems concurrently
    const [llmResult, boostScoreResult] = await Promise.allSettled([
      // LLM Parser
      (async () => {
        const parser = createLLMParser({
          openaiApiKey: process.env.OPENAI_API_KEY,
        });
        return await parser.parseStatement(buffer, {
          password: payload.pass_str,
          dob: payload.dob,
          last4: payload.card_no,
          bank: payload.bank,
        });
      })(),

      // BoostScore
      (async () => {
        const { boostScoreClient } = await import('@/lib/boostscore/client');
        const uploadResponse = await boostScoreClient.uploadStatement(
          new Blob([buffer]),
          payload
        );
        return await boostScoreClient.pollStatementContent(uploadResponse.id);
      })(),
    ]);

    // Process LLM result
    const llmSuccess = llmResult.status === 'fulfilled' && llmResult.value.success;
    const llmData = llmSuccess ? llmResult.value : null;

    // Process BoostScore result
    const bsSuccess = boostScoreResult.status === 'fulfilled' && boostScoreResult.value.status === 'COMPLETED';
    const bsData = bsSuccess ? boostScoreResult.value : null;

    // Compare results
    const comparison: any = {
      timestamp: new Date().toISOString(),
      file: {
        name: file.name,
        size: file.size,
        bank: payload.bank,
      },
      llm: {
        success: llmSuccess,
        cost: llmData?.cost || 0,
        latency: llmData?.latency || 0,
        confidence: llmData?.confidence || 0,
        transactionCount: llmData?.content?.transactions.length || 0,
        provider: llmData?.provider,
        model: llmData?.model,
        error: llmResult.status === 'rejected' ? llmResult.reason?.message : undefined,
      },
      boostscore: {
        success: bsSuccess,
        latency: 0, // BoostScore doesn't provide this directly
        transactionCount: bsData?.content?.transactions.length || 0,
        error: boostScoreResult.status === 'rejected' ? boostScoreResult.reason?.message : undefined,
      },
      totalLatency: Date.now() - startTime,
    };

    // If both successful, compare transactions
    if (llmSuccess && bsSuccess && llmData && bsData) {
      const llmTxns = llmData.content!.transactions;
      const bsTxns = bsData.content!.transactions;

      comparison.comparison = {
        transactionCountMatch: llmTxns.length === bsTxns.length,
        llmCount: llmTxns.length,
        bsCount: bsTxns.length,
        difference: Math.abs(llmTxns.length - bsTxns.length),
        
        // Compare total amounts
        llmTotal: llmTxns.reduce((sum, t) => sum + t.amount, 0),
        bsTotal: bsTxns.reduce((sum, t) => sum + t.amount, 0),
        
        // Sample comparison (first 5 transactions)
        sampleComparison: llmTxns.slice(0, 5).map((llmTxn, idx) => {
          const bsTxn = bsTxns[idx];
          return {
            llm: {
              date: llmTxn.date,
              desc: llmTxn.description,
              amount: llmTxn.amount,
              category: llmTxn.category,
            },
            boostscore: bsTxn ? {
              date: bsTxn.date,
              desc: bsTxn.description,
              amount: bsTxn.amount,
              category: bsTxn.category,
            } : null,
            match: bsTxn && Math.abs(llmTxn.amount - bsTxn.amount) < 0.01,
          };
        }),
      };

      // Calculate accuracy metrics
      comparison.metrics = {
        costSavings: 10 - (llmData.cost || 0), // Assume BoostScore costs ₹10
        costSavingsPercent: Math.round((1 - (llmData.cost || 0) / 10) * 100),
        speedImprovement: comparison.boostscore.latency > 0 
          ? Math.round((1 - llmData.latency / comparison.boostscore.latency) * 100)
          : null,
        accuracyScore: comparison.comparison.transactionCountMatch ? 100 : 
          Math.round((Math.min(llmTxns.length, bsTxns.length) / Math.max(llmTxns.length, bsTxns.length)) * 100),
      };
    }

    console.log(`✅ Comparison complete:`);
    console.log(`   LLM: ${comparison.llm.success ? '✓' : '✗'} (${comparison.llm.transactionCount} txns, ₹${comparison.llm.cost.toFixed(4)})`);
    console.log(`   BoostScore: ${comparison.boostscore.success ? '✓' : '✗'} (${comparison.boostscore.transactionCount} txns)`);
    if (comparison.metrics) {
      console.log(`   Cost savings: ₹${comparison.metrics.costSavings.toFixed(2)} (${comparison.metrics.costSavingsPercent}%)`);
      console.log(`   Accuracy: ${comparison.metrics.accuracyScore}%`);
    }

    return NextResponse.json(comparison);

  } catch (error: any) {
    console.error('❌ Comparison error:', error);
    
    return NextResponse.json(
      {
        error: 'Comparison failed',
        message: error.message,
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}




