/**
 * POST /api/parser-llm/upload
 * Upload and parse credit card statement using LLM
 * Compatible with BoostScore API format
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLLMParser } from '@/lib/parser-llm';
import type { BoostScoreUploadPayload, BoostScoreContentResponse } from '@/types/boostscore';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for LLM processing

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check if LLM parser is enabled
    const enabled = process.env.LLM_PARSER_ENABLED === 'true';
    if (!enabled) {
      return NextResponse.json(
        { error: 'LLM parser not enabled. Set LLM_PARSER_ENABLED=true' },
        { status: 503 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const payloadStr = formData.get('payload') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!payloadStr) {
      return NextResponse.json(
        { error: 'No payload provided' },
        { status: 400 }
      );
    }

    // Parse payload
    let payload: BoostScoreUploadPayload;
    try {
      payload = JSON.parse(payloadStr);
    } catch {
      return NextResponse.json(
        { error: 'Invalid payload JSON' },
        { status: 400 }
      );
    }

    // Validate payload
    if (!payload.bank || !payload.name) {
      return NextResponse.json(
        { error: 'Missing required fields: bank, name' },
        { status: 400 }
      );
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 413 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`📤 LLM Parser: Processing ${file.name} (${file.size} bytes)`);
    console.log(`   Bank: ${payload.bank}`);
    console.log(`   Name: ${payload.name}`);

    // Create parser
    const parser = createLLMParser({
      primaryProvider: (process.env.LLM_PARSER_PRIMARY_PROVIDER as any) || 'openai',
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      geminiApiKey: process.env.GOOGLE_AI_API_KEY,
      maxCostPerStatement: parseFloat(process.env.LLM_PARSER_MAX_COST_PER_STATEMENT || '5'),
    });

    // Parse the statement
    const result = await parser.parseStatement(buffer, {
      password: payload.pass_str,
      dob: payload.dob,
      last4: payload.card_no,
      bank: payload.bank,
    });

    const totalLatency = Date.now() - startTime;

    if (!result.success) {
      console.error(`❌ Parse failed: ${result.error}`);
      return NextResponse.json(
        {
          error: result.error || 'Parsing failed',
          latency_ms: totalLatency,
          cost: result.cost,
        },
        { status: 500 }
      );
    }

    console.log(`✅ Parse successful!`);
    console.log(`   Latency: ${totalLatency}ms`);
    console.log(`   Cost: ₹${result.cost.toFixed(4)}`);
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`   Transactions: ${result.content?.transactions.length}`);

    // Convert to BoostScore-compatible format
    const response: BoostScoreContentResponse = {
      id: generateStatementId(),
      status: 'COMPLETED',
      content: {
        card_details: {
          bank: result.content!.bank,
          num: result.content!.card_details.masked_number,
          card_type: result.content!.card_details.card_type,
          credit_limit: result.content!.card_details.credit_limit || 0,
          available_credit_limit: result.content!.card_details.available_credit || 0,
          available_cash_limit: 0,
        },
        owner_details: {
          name: result.content!.owner_details.name,
          email: result.content!.owner_details.email,
        },
        summary: {
          statement_date: formatDateToDDMMYYYY(result.content!.statement_period.end_date),
          payment_due_date: formatDateToDDMMYYYY(result.content!.statement_period.due_date),
          total_dues: result.content!.summary.total_dues,
          min_amount_due: result.content!.summary.minimum_due,
          opening_balance: result.content!.summary.previous_balance,
          payment_amount: result.content!.summary.payment_received || 0,
          purchase_amount: result.content!.summary.purchase_amount || 0,
          financial_charges: 0,
          cash_advances: 0,
        },
        transactions: result.content!.transactions.map((txn, idx) => ({
          id: idx + 1,
          type: txn.type,
          date: formatDateToDDMMYYYY(txn.date),
          amount: txn.amount,
          description: txn.description,
          category: txn.category || '',
          sub_category: txn.sub_category || '',
        })),
      },
    };

    // Add metadata
    const metadata = {
      parser: 'llm',
      provider: result.provider,
      model: result.model,
      cost: result.cost,
      latency_ms: totalLatency,
      confidence: result.confidence,
      warnings: result.warnings,
    };

    return NextResponse.json({
      ...response,
      _metadata: metadata,
    });

  } catch (error: any) {
    console.error('❌ LLM parser error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error',
        latency_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate unique statement ID
 */
function generateStatementId(): string {
  return `llm_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Convert YYYY-MM-DD to DDMMYYYY (BoostScore format)
 */
function formatDateToDDMMYYYY(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}${month}${year}`;
}




