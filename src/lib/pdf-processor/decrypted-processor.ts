/**
 * Background processor for decrypted PDFs
 * Processes PDFs saved by qpdf decryption
 */

import type { BoostScoreContentResponse } from '@/types/boostscore';
import { mapTransactionCategory } from '@/lib/mapper/complete-mapper';
import { readFileSync, unlinkSync } from 'fs';
import { createOpenAIProvider } from '@/lib/parser-llm/providers/openai';

export type DecryptedPDFProcessingResult = {
  success: boolean;
  data?: BoostScoreContentResponse;
  error?: string;
};

export class DecryptedPDFProcessor {
  constructor() {}

  /**
   * Process a decrypted PDF file from disk
   */
  async processDecryptedPDF(
    filePath: string,
    bankCode: string,
    cleanup: boolean = true
  ): Promise<DecryptedPDFProcessingResult> {
    try {
      console.log(`📄 Processing decrypted PDF: ${filePath}`);
      
      // Read the decrypted PDF
      const pdfBuffer = readFileSync(filePath);
      console.log(`📊 PDF size: ${pdfBuffer.length} bytes`);

      // Extract text by spawning a Node script to avoid SSR bundling issues
      const { spawnSync } = await import('node:child_process');
      const { join } = await import('node:path');
      const extractor = join(process.cwd(), 'scripts', 'extract-text.js');
      const res = spawnSync(process.execPath, [extractor, filePath], { encoding: 'utf-8' });
      if (res.status !== 0) {
        throw new Error(`Text extraction failed: ${res.stderr || res.stdout || 'unknown error'}`);
      }
      const parsed = JSON.parse(res.stdout || '{}');
      const text = parsed.text || '';

      // Call OpenAI provider directly with extracted text
      const provider = createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
      });

      const llmResult = await provider.parseStatement(text, bankCode, {
        maxRetries: 2,
      });

      if (llmResult.success && llmResult.content) {
        // Convert to BoostScore format
        const boostScoreFormat = this.convertLLMToBoostScoreFormat(llmResult.content, bankCode);
        
        console.log(`✅ Successfully processed decrypted PDF`);
        console.log(`💰 Cost: ₹${llmResult.cost.toFixed(4)}, Confidence: ${llmResult.confidence}%`);
        
        // Cleanup decrypted file if requested
        if (cleanup) {
          try {
            unlinkSync(filePath);
            console.log(`🗑️ Cleaned up decrypted file: ${filePath}`);
          } catch (err) {
            console.warn(`⚠️ Could not delete file: ${filePath}`);
          }
        }
        
        return {
          success: true,
          data: boostScoreFormat,
        };
      } else {
        console.error(`❌ LLM parsing failed: ${llmResult.error}`);
        return {
          success: false,
          error: llmResult.error || 'LLM parsing failed',
        };
      }
      
    } catch (error: any) {
      console.error(`❌ Failed to process decrypted PDF:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Convert LLM parser output to BoostScore format
   */
  private convertLLMToBoostScoreFormat(llmData: any, bankCode: string): BoostScoreContentResponse {
    // Preserve LLM categories, only use mapper as fallback
    const categorizedTransactions = llmData.transactions.map((txn: any) => ({
      ...txn,
      // Only use mapper if LLM didn't assign a category
      category: txn.category || mapTransactionCategory(txn.description, '', '', txn.amount),
    }));

    return {
      id: llmData.id || 'llm-parsed',
      status: 'COMPLETED',
      content: {
        card_details: {
          bank: bankCode,
          num: llmData.cardNumber || '****',
          card_type: llmData.cardType || 'Credit Card',
          credit_limit: llmData.creditLimit || 0,
          available_credit_limit: llmData.availableLimit || 0,
          available_cash_limit: llmData.cashLimit || 0,
        },
        owner_details: {
          name: llmData.customerName || 'Card Holder',
          email: llmData.email,
        },
        summary: {
          statement_date: llmData.statementDate || '',
          payment_due_date: llmData.paymentDueDate || '',
          total_dues: llmData.totalDues || 0,
          min_amount_due: llmData.minAmountDue || 0,
          opening_balance: llmData.openingBalance || 0,
          payment_amount: llmData.paymentAmount || 0,
          purchase_amount: llmData.purchaseAmount || 0,
          financial_charges: llmData.financialCharges || 0,
          cash_advances: llmData.cashAdvances || 0,
        },
        transactions: categorizedTransactions,
        reward_summary: llmData.rewardSummary ? {
          opening_balance: llmData.rewardSummary.openingBalance || 0,
          earned: llmData.rewardSummary.earned || 0,
          redeemed: llmData.rewardSummary.redeemed || 0,
          expired: llmData.rewardSummary.expired || 0,
          closing_balance: llmData.rewardSummary.closingBalance || 0,
          points_expiring: llmData.rewardSummary.pointsExpiring || 0,
          expiry_date: llmData.rewardSummary.expiryDate || '',
        } : undefined,
      },
    };
  }
}

