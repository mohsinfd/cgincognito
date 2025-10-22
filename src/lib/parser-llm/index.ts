/**
 * Main LLM Parser Class
 * Orchestrates PDF extraction, LLM parsing, and validation
 */

import type { ParsedStatementContent, LLMResponse, LLMProvider } from './providers/types';
import { extractTextFromPDF, tryPasswordCombinations, extractPreview, isLikelyScanned, cleanText } from './core/pdf-extractor';
import { createOpenAIProvider } from './providers/openai';
import { validateParsedContent, calculateConfidence } from './core/validator';
import { getBankExample } from './prompts/statement-extraction';

export type ParseResult = {
  success: boolean;
  content?: ParsedStatementContent;
  provider?: LLMProvider;
  model?: string;
  cost: number;
  latency: number;
  confidence?: number;
  error?: string;
  warnings?: string[];
};

export type LLMParserConfig = {
  primaryProvider?: LLMProvider;
  fallbackProviders?: LLMProvider[];
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  maxCostPerStatement?: number;
  enableFallback?: boolean;
};

export class LLMStatementParser {
  private config: LLMParserConfig;

  constructor(config: LLMParserConfig = {}) {
    this.config = {
      primaryProvider: 'openai',
      fallbackProviders: [],
      maxCostPerStatement: 5, // ₹5
      enableFallback: true,
      ...config,
    };
  }

  /**
   * Parse a PDF statement
   */
  async parseStatement(
    pdfBuffer: Buffer,
    options?: {
      password?: string;
      dob?: string;
      last4?: string;
      bank?: string;
    }
  ): Promise<ParseResult> {
    const startTime = Date.now();
    let totalCost = 0;

    try {
      // Step 1: Extract text from PDF
      console.log('📄 Extracting text from PDF...');
      let extractResult;
      
      try {
        extractResult = await extractTextFromPDF(pdfBuffer, options?.password);
      } catch (error: any) {
        if (error.message === 'PDF_ENCRYPTED' && (options?.dob || options?.last4)) {
          // Try password combinations
          console.log('🔐 PDF encrypted, trying password combinations...');
          const passwordResult = await tryPasswordCombinations(pdfBuffer, {
            dob: options.dob,
            last4: options.last4,
          });

          if (!passwordResult.success) {
            return {
              success: false,
              cost: 0,
              latency: Date.now() - startTime,
              error: 'Failed to decrypt PDF. Please provide the correct password.',
            };
          }

          extractResult = await extractTextFromPDF(pdfBuffer, passwordResult.password);
        } else {
          throw error;
        }
      }

      // Check if this is a decrypted PDF that needs secondary processing
      const decryptedPath = (extractResult.metadata as any)?.decryptedPath;
      if (decryptedPath && extractResult.text.includes('[PDF_DECRYPTED_SUCCESSFULLY]')) {
        console.log(`🔄 PDF was decrypted and saved. Secondary processing needed.`);
        console.log(`📂 Decrypted file path: ${decryptedPath}`);
        
        // Return a special success marker that the processor can detect
        return {
          success: true,
          content: {
            id: 'decrypted-pending',
            statementDate: '',
            paymentDueDate: '',
            customerName: '',
            email: '',
            cardNumber: '',
            cardType: '',
            transactions: [],
            metadata: { decryptedPath },
          } as any,
          provider: 'qpdf',
          model: 'decryption-only',
          cost: 0,
          latency: Date.now() - startTime,
          confidence: 100,
        };
      }
      
      // Clean the text
      const text = cleanText(extractResult.text);

      // Check if likely scanned
      if (isLikelyScanned(text)) {
        return {
          success: false,
          cost: 0,
          latency: Date.now() - startTime,
          error: 'PDF appears to be scanned. OCR support coming soon.',
        };
      }

      console.log(`✅ Extracted ${text.length} characters from ${extractResult.numPages} pages`);

      // Step 2: Detect bank (if not provided)
      let bank = options?.bank;
      if (!bank) {
        console.log('🏦 Detecting bank...');
        const preview = extractPreview(text);
        const provider = createOpenAIProvider({
          apiKey: this.config.openaiApiKey,
          model: 'gpt-4o-mini',
        });

        const bankResult = await provider.detectBank(preview);
        bank = bankResult.bank;
        totalCost += bankResult.cost;
        console.log(`✅ Bank detected: ${bank} (cost: ₹${bankResult.cost.toFixed(4)})`);
      }

      // Step 3: Parse with LLM
      console.log('🤖 Parsing with LLM...');
      const provider = createOpenAIProvider({
        apiKey: this.config.openaiApiKey,
        model: 'gpt-4o-mini', // Start with cheaper model
      });

      // Get bank-specific examples if available
      const fewShotExamples = getBankExample(bank);

      const llmResult = await provider.parseStatement(text, bank, {
        fewShotExamples,
        maxRetries: 2,
      });

      totalCost += llmResult.cost;

      console.log(`✅ LLM parsing complete (cost: ₹${llmResult.cost.toFixed(4)})`);
      console.log(`   Tokens: ${llmResult.tokens.input} input, ${llmResult.tokens.output} output`);
      console.log(`   Transactions found: ${llmResult.content.transactions.length}`);

      // Step 4: Validate
      console.log('✔️  Validating output...');
      const validation = validateParsedContent(llmResult.content);

      if (!validation.valid) {
        console.error('❌ Validation failed:', validation.errors);
        
        // If cost allows, retry with better model
        if (totalCost < (this.config.maxCostPerStatement || 5) / 2) {
          console.log('🔄 Retrying with GPT-4o...');
          const betterProvider = createOpenAIProvider({
            apiKey: this.config.openaiApiKey,
            model: 'gpt-4o',
          });

          const retryResult = await betterProvider.parseStatement(text, bank, {
            fewShotExamples,
            maxRetries: 1,
          });

          totalCost += retryResult.cost;

          const retryValidation = validateParsedContent(retryResult.content);
          if (retryValidation.valid) {
            const confidence = calculateConfidence(retryValidation.content!);
            
            return {
              success: true,
              content: retryValidation.content,
              provider: 'openai',
              model: 'gpt-4o',
              cost: totalCost,
              latency: Date.now() - startTime,
              confidence,
              warnings: retryValidation.warnings,
            };
          }
        }

        return {
          success: false,
          cost: totalCost,
          latency: Date.now() - startTime,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Calculate confidence
      const confidence = calculateConfidence(validation.content!);

      console.log(`✅ Validation passed (confidence: ${confidence}%)`);
      if (validation.warnings.length > 0) {
        console.log('⚠️  Warnings:', validation.warnings);
      }

      return {
        success: true,
        content: validation.content,
        provider: llmResult.provider,
        model: llmResult.model,
        cost: totalCost,
        latency: Date.now() - startTime,
        confidence,
        warnings: validation.warnings,
      };

    } catch (error: any) {
      console.error('❌ Parse error:', error);
      return {
        success: false,
        cost: totalCost,
        latency: Date.now() - startTime,
        error: error.message || 'Unknown parsing error',
      };
    }
  }
}

/**
 * Create parser instance
 */
export function createLLMParser(config?: LLMParserConfig): LLMStatementParser {
  return new LLMStatementParser(config);
}



