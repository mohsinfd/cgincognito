/**
 * BoostScore API client
 * Based on PRD Section E and S
 */

import type {
  BoostScoreUploadPayload,
  BoostScoreUploadResponse,
  BoostScoreContentResponse,
  BoostScoreError,
} from '@/types/boostscore';

export class BoostScoreClient {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(baseUrl?: string, apiKey?: string, apiSecret?: string) {
    this.baseUrl = baseUrl || process.env.BOOST_BASE_URL || 'https://trial-cc.boostscore.in';
    this.apiKey = apiKey || process.env.BOOST_API_KEY || '';
    this.apiSecret = apiSecret || process.env.BOOST_API_SECRET || '';

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('BoostScore API credentials not configured');
    }
  }

  /**
   * Upload a statement file to BoostScore
   * @param file File blob or buffer
   * @param payload Upload metadata
   * @returns Upload response with ID and ETA
   */
  async uploadStatement(
    file: File | Blob | Buffer,
    payload: BoostScoreUploadPayload
  ): Promise<BoostScoreUploadResponse> {
    const formData = new FormData();
    
    // Add file
    if (file instanceof Buffer) {
      formData.append('file', new Blob([file]), 'statement.pdf');
    } else {
      formData.append('file', file);
    }

    // Add payload as JSON string
    formData.append('payload', JSON.stringify(payload));

    const response = await fetch(`${this.baseUrl}/bank-service/v1/statements`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'x-api-secret': this.apiSecret,
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }

    return await response.json();
  }

  /**
   * Retrieve statement content by ID
   * @param statementId Statement ID from upload response
   * @returns Statement content with status
   */
  async getStatementContent(statementId: string): Promise<BoostScoreContentResponse> {
    const response = await fetch(
      `${this.baseUrl}/bank-service/v1/statements/${statementId}/content`,
      {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'x-api-secret': this.apiSecret,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await this.handleError(response);
      throw error;
    }

    return await response.json();
  }

  /**
   * Poll for statement content with exponential backoff
   * @param statementId Statement ID
   * @param maxAttempts Maximum polling attempts (default 30)
   * @param initialDelay Initial delay in ms (default 2000)
   * @returns Completed statement content
   */
  async pollStatementContent(
    statementId: string,
    maxAttempts: number = 30,
    initialDelay: number = 2000
  ): Promise<BoostScoreContentResponse> {
    let attempt = 0;
    let delay = initialDelay;

    while (attempt < maxAttempts) {
      const content = await this.getStatementContent(statementId);

      if (content.status === 'COMPLETED') {
        return content;
      }

      if (content.status === 'FAILED') {
        throw new Error(`Statement processing failed: ${content.error_message || 'Unknown error'}`);
      }

      // Wait before next attempt with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      attempt++;
      // Backoff: 2s → 3s → 5s → 5s → ...
      delay = Math.min(delay * 1.5, 5000);
    }

    throw new Error(`Statement processing timeout after ${maxAttempts} attempts`);
  }

  /**
   * Handle API errors
   */
  private async handleError(response: Response): Promise<Error> {
    let errorData: BoostScoreError | null = null;

    try {
      errorData = await response.json();
    } catch {
      // Response not JSON
    }

    const message = errorData?.message || response.statusText || 'Unknown error';
    const statusCode = response.status;

    // Map to user-friendly errors
    switch (statusCode) {
      case 400:
        return new Error(`Invalid request: ${message}`);
      case 401:
      case 403:
        return new Error('Authentication failed. Please check API credentials.');
      case 413:
        return new Error('File too large. Maximum size is 10MB.');
      case 429:
        return new Error('Rate limit exceeded. Please try again later.');
      case 500:
        if (message.includes('decrypt') || message.includes('password')) {
          return new Error('Failed to decrypt PDF. Please provide the correct password.');
        }
        return new Error(`Server error: ${message}`);
      case 504:
        return new Error('Request timeout. Please try again.');
      default:
        return new Error(`API error (${statusCode}): ${message}`);
    }
  }
}

/**
 * Singleton instance
 */
export const boostScoreClient = new BoostScoreClient();

