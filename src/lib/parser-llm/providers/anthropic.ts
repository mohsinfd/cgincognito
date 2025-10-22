/**
 * Anthropic (Claude) Provider for Statement Parsing
 * Uses Claude 3.5 Sonnet or Claude 3 Haiku
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

export class AnthropicProvider implements ILLMProvider {
  name: LLMProvider = 'anthropic';
  private apiKey: string;
  private model: LLMModel;
  private client: any; // Anthropic client

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = config.model || 'claude-3-haiku-20240307';

    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }
  }

  private async getClient() {
    if (!this.client) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const client = await this.getClient();
      // Test with a minimal request
      await client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error) {
      console.error('Anthropic provider unavailable:', error);
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
      const response = await client.messages.create({
        model: 'claude-3-haiku-20240307', // Use cheaper model
        max_tokens: 20,
        messages: [
          { role: 'user', content: prompt },
        ],
      });

      const bank = response.content[0]?.text?.trim() || 'UNKNOWN';
      const latency = Date.now() - startTime;

      // Calculate cost (Haiku: ~₹0.0025 input, ₹0.0125 output per 1K tokens)
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const cost = (inputTokens * 0.0025 / 1000) + (outputTokens * 0.0125 / 1000);

      return {
        bank: bank.toUpperCase(),
        confidence: 0.9,
        cost,
        latency,
      };
    } catch (error: any) {
      console.error('Anthropic bank detection failed:', error);
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
        const response = await client.messages.create({
          model: this.model,
          max_tokens: 4096,
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const content = response.content[0]?.text;
        if (!content) {
          throw new Error('Empty response from Anthropic');
        }

        // Extract JSON from response (Claude sometimes wraps it in markdown)
        let jsonStr = content;
        const jsonMatch = content.match(/```json\n?([\s\S]+?)\n?```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }

        // Parse JSON response
        const parsed = JSON.parse(jsonStr) as ParsedStatementContent;

        // Calculate cost
        // Claude 3 Haiku: ₹0.0025 input, ₹0.0125 output per 1K tokens
        // Claude 3.5 Sonnet: ₹0.03 input, ₹0.15 output per 1K tokens
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;

        let inputCost = 0.0025;
        let outputCost = 0.0125;
        if (this.model.includes('sonnet')) {
          inputCost = 0.03;
          outputCost = 0.15;
        }

        const cost = (inputTokens * inputCost / 1000) + (outputTokens * outputCost / 1000);
        const latency = Date.now() - startTime;

        return {
          content: parsed,
          provider: 'anthropic',
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
        console.error(`Anthropic parse attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Anthropic parsing failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
}

/**
 * Create Anthropic provider instance
 */
export function createAnthropicProvider(config?: Partial<LLMProviderConfig>): AnthropicProvider {
  return new AnthropicProvider({
    apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY || '',
    model: config?.model || 'claude-3-haiku-20240307',
    ...config,
  });
}




