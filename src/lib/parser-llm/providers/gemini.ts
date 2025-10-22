/**
 * Google Gemini Provider for Statement Parsing
 * Uses Gemini 1.5 Pro or Gemini 1.5 Flash (most cost-effective)
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

export class GeminiProvider implements ILLMProvider {
  name: LLMProvider = 'gemini';
  private apiKey: string;
  private model: LLMModel;
  private client: any; // GoogleGenerativeAI client

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey || process.env.GOOGLE_AI_API_KEY || '';
    this.model = config.model || 'gemini-1.5-flash';

    if (!this.apiKey) {
      throw new Error('Google AI API key not configured');
    }
  }

  private async getClient() {
    if (!this.client) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      this.client = new GoogleGenerativeAI(this.apiKey);
    }
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const model = client.getGenerativeModel({ model: this.model });
      await model.generateContent('test');
      return true;
    } catch (error) {
      console.error('Gemini provider unavailable:', error);
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
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const bank = response.text()?.trim() || 'UNKNOWN';
      const latency = Date.now() - startTime;

      // Gemini Flash: ~₹0.0004 input, ₹0.0015 output per 1K tokens (very cheap!)
      const inputTokens = response.usageMetadata?.promptTokenCount || 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
      const cost = (inputTokens * 0.0004 / 1000) + (outputTokens * 0.0015 / 1000);

      return {
        bank: bank.toUpperCase(),
        confidence: 0.85, // Slightly less confident than GPT/Claude
        cost,
        latency,
      };
    } catch (error: any) {
      console.error('Gemini bank detection failed:', error);
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
        const model = client.getGenerativeModel({
          model: this.model,
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json', // Request JSON output
          },
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const content = response.text();

        if (!content) {
          throw new Error('Empty response from Gemini');
        }

        // Parse JSON response
        const parsed = JSON.parse(content) as ParsedStatementContent;

        // Calculate cost
        // Gemini 1.5 Flash: ₹0.0004 input, ₹0.0015 output per 1K tokens
        // Gemini 1.5 Pro: ₹0.01 input, ₹0.03 output per 1K tokens
        const inputTokens = response.usageMetadata?.promptTokenCount || 0;
        const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

        let inputCost = 0.0004;
        let outputCost = 0.0015;
        if (this.model.includes('pro')) {
          inputCost = 0.01;
          outputCost = 0.03;
        }

        const cost = (inputTokens * inputCost / 1000) + (outputTokens * outputCost / 1000);
        const latency = Date.now() - startTime;

        return {
          content: parsed,
          provider: 'gemini',
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
        console.error(`Gemini parse attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Gemini parsing failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
}

/**
 * Create Gemini provider instance
 */
export function createGeminiProvider(config?: Partial<LLMProviderConfig>): GeminiProvider {
  return new GeminiProvider({
    apiKey: config?.apiKey || process.env.GOOGLE_AI_API_KEY || '',
    model: config?.model || 'gemini-1.5-flash',
    ...config,
  });
}




