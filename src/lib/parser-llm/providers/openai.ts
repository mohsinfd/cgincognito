/**
 * OpenAI Provider for Statement Parsing
 * Uses GPT-4o or GPT-4o-mini with structured output
 */

import type {
  ILLMProvider,
  LLMProvider,
  LLMModel,
  LLMResponse,
  ParsedStatementContent,
  LLMProviderConfig,
} from './types';
import { getStatementExtractionPrompt, getBankDetectionPrompt } from '../prompts/statement-extraction';
import { TRANSACTION_SCHEMA } from '../prompts/transaction-schema';

// Valid categories for validation
const VALID_CATEGORIES = [
  'amazon_spends', 'flipkart_spends', 'grocery_spends_online', 'online_food_ordering',
  'dining_or_going_out', 'other_online_spends', 'other_offline_spends', 'flights',
  'hotels', 'mobile_phone_bills', 'electricity_bills', 'water_bills', 'ott_channels',
  'fuel', 'school_fees', 'rent', 'insurance_health', 'insurance_car_or_bike',
  'large_electronics', 'pharmacy'
];

export class OpenAIProvider implements ILLMProvider {
  name: LLMProvider = 'openai';
  private apiKey: string;
  private model: LLMModel;
  private client: any; // OpenAI client

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config.model || 'gpt-4o-mini';

    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
  }

  private async getClient() {
    if (!this.client) {
      const { default: OpenAI } = await import('openai');
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const client = await this.getClient();
      // Test with a minimal request
      await client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });
      return true;
    } catch (error) {
      console.error('OpenAI provider unavailable:', error);
      return false;
    }
  }

  async detectBank(previewText: string): Promise<{
    bank: string;
    confidence: number;
    cost: number;
    latency: number;
  }> {
    const startTime = Date.now();
    const client = await this.getClient();

    const prompt = getBankDetectionPrompt(previewText);

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini', // Use cheaper model for detection
        messages: [
          { role: 'system', content: 'You are a bank identifier. Respond only with the bank code.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 20,
        temperature: 0,
      });

      const bank = response.choices[0]?.message?.content?.trim() || 'UNKNOWN';
      const latency = Date.now() - startTime;

      // Calculate cost (gpt-4o-mini: ~₹0.0015 per 1K input tokens)
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const cost = (inputTokens * 0.0015 / 1000) + (outputTokens * 0.006 / 1000);

      return {
        bank: bank.toUpperCase(),
        confidence: 0.9, // OpenAI generally reliable
        cost,
        latency,
      };
    } catch (error: any) {
      console.error('OpenAI bank detection failed:', error);
      return {
        bank: 'UNKNOWN',
        confidence: 0,
        cost: 0,
        latency: Date.now() - startTime,
      };
    }
  }

  async parseStatement(
    text: string,
    bank?: string,
    options?: {
      fewShotExamples?: string;
      maxRetries?: number;
    }
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const client = await this.getClient();

    const prompt = getStatementExtractionPrompt(text, bank, options?.fewShotExamples);

    const maxRetries = options?.maxRetries || 2;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert credit card statement parser. Extract transaction data accurately and return valid JSON that matches the provided schema.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { 
            type: 'json_schema',
            json_schema: {
              name: 'statement_parser',
              schema: TRANSACTION_SCHEMA,
              strict: true
            }
          },
          temperature: 0, // Deterministic output
          max_tokens: 4096,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        // Parse JSON response
        let parsed: ParsedStatementContent;
        try {
          parsed = JSON.parse(content) as ParsedStatementContent;
          
          // Validate required fields
          if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
            throw new Error('Missing or invalid transactions array');
          }
          
          if (!parsed.bank) {
            throw new Error('Missing bank field');
          }
          
          // Validate transaction structure
          for (const txn of parsed.transactions) {
            if (!txn.date || !txn.description || typeof txn.amount !== 'number') {
              throw new Error(`Invalid transaction: ${JSON.stringify(txn)}`);
            }
            
            // Validate category if present
            if (txn.category && !VALID_CATEGORIES.includes(txn.category)) {
              console.warn(`Invalid category "${txn.category}" for transaction: ${txn.description}`);
            }
          }
          
        } catch (jsonError: any) {
          console.error(`OpenAI parse attempt ${attempt + 1} failed: ${jsonError.message}`);
          console.error(`Raw content: ${content.substring(0, 200)}...`);
          
          // Try to clean up common JSON issues
          let cleanContent = content;
          
          // Remove markdown code blocks if present
          if (cleanContent.includes('```json')) {
            cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          } else if (cleanContent.includes('```')) {
            cleanContent = cleanContent.replace(/```\n?/g, '');
          }
          
          // Try parsing again
          try {
            parsed = JSON.parse(cleanContent) as ParsedStatementContent;
          } catch (retryError: any) {
            console.error(`Retry parse failed: ${retryError.message}`);
            throw new Error(`Invalid JSON response: ${jsonError.message}`);
          }
        }

        // Calculate cost (gpt-4o-mini: ₹0.0015 input, ₹0.006 output per 1K tokens)
        // (gpt-4o: ₹0.05 input, ₹0.15 output per 1K tokens)
        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;
        
        let inputCost = 0.0015;
        let outputCost = 0.006;
        if (this.model === 'gpt-4o') {
          inputCost = 0.05;
          outputCost = 0.15;
        }

        const cost = (inputTokens * inputCost / 1000) + (outputTokens * outputCost / 1000);
        const latency = Date.now() - startTime;

        return {
          content: parsed,
          provider: 'openai',
          model: this.model,
          cost,
          latency,
          tokens: {
            input: inputTokens,
            output: outputTokens,
          },
        };
      } catch (error: any) {
        lastError = error;
        console.error(`OpenAI parse attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < maxRetries - 1) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`OpenAI parsing failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
}

/**
 * Create OpenAI provider instance
 */
export function createOpenAIProvider(config?: Partial<LLMProviderConfig>): OpenAIProvider {
  return new OpenAIProvider({
    apiKey: config?.apiKey || process.env.OPENAI_API_KEY || '',
    model: config?.model || 'gpt-4o-mini',
    ...config,
  });
}


