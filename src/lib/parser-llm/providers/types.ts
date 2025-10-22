/**
 * Common types for LLM providers
 */

import type { TransactionCategory } from '@/types/cg-buckets';

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export type LLMModel = 
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-haiku-20240307'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash';

export type ParsedStatementContent = {
  bank: string;
  card_details: {
    card_type: string;
    masked_number: string;
    credit_limit?: number;
    available_credit?: number;
  };
  owner_details: {
    name: string;
    email?: string;
  };
  statement_period: {
    start_date: string;  // YYYY-MM-DD
    end_date: string;    // YYYY-MM-DD
    due_date: string;    // YYYY-MM-DD
  };
  summary: {
    total_dues: number;
    minimum_due: number;
    previous_balance: number;
    payment_received?: number;
    purchase_amount?: number;
  };
  transactions: ParsedTransaction[];
};

export type ParsedTransaction = {
  date: string;        // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'Dr' | 'Cr';
  category?: TransactionCategory;
  sub_category?: string;
};

export type LLMResponse = {
  content: ParsedStatementContent;
  provider: LLMProvider;
  model: LLMModel;
  cost: number;          // Cost in ₹
  latency: number;       // Time in ms
  tokens: {
    input: number;
    output: number;
  };
};

export type LLMProviderConfig = {
  apiKey: string;
  model: LLMModel;
  maxTokens?: number;
  temperature?: number;
};

export interface ILLMProvider {
  name: LLMProvider;
  
  /**
   * Parse statement text and return structured data
   */
  parseStatement(
    text: string,
    bank?: string,
    options?: {
      fewShotExamples?: string;
      maxRetries?: number;
    }
  ): Promise<LLMResponse>;

  /**
   * Quick bank detection from preview text
   */
  detectBank(previewText: string): Promise<{
    bank: string;
    confidence: number;
    cost: number;
    latency: number;
  }>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}


