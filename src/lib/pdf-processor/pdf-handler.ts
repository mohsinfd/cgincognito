/**
 * PDF Processing Handler
 * Downloads PDFs from Gmail and handles password attempts
 */

import { GmailClient } from '@/lib/gmail/client';
import { BoostScoreClient } from '@/lib/boostscore/client';
import type { BoostScoreUploadPayload, BoostScoreContentResponse } from '@/types/boostscore';

export type PDFProcessingResult = {
  success: boolean;
  data?: BoostScoreContentResponse;
  error?: string;
  passwordUsed?: string;
  attempts?: number;
};

export type UserDetails = {
  name?: string; // Name as on card (e.g., "JOHN DOE")
  dob?: string; // DDMMYYYY format
  cardNumbers?: string[]; // Last 2-4 digits
};

export class PDFProcessor {
  private gmailClient: GmailClient;
  private boostScoreClient: BoostScoreClient;

  constructor(gmailClient: GmailClient, boostScoreClient: BoostScoreClient) {
    this.gmailClient = gmailClient;
    this.boostScoreClient = boostScoreClient;
  }

  /**
   * Process a single statement PDF
   */
  async processStatement(
    messageId: string,
    attachmentId: string,
    filename: string,
    bankCode: string,
    userDetails?: UserDetails
  ): Promise<PDFProcessingResult> {
    try {
      console.log(`📥 Downloading PDF: ${filename} (attachment_id: ${attachmentId})`);
      
      // 1. Download PDF from Gmail
      const pdfBuffer = await this.gmailClient.getAttachment(messageId, attachmentId);
      
      console.log(`📄 PDF downloaded: ${pdfBuffer.length} bytes`);
      
      if (pdfBuffer.length === 0) {
        throw new Error('Downloaded PDF is empty');
      }
      
      // 2. Try to parse with different password combinations
      return await this.parseWithPasswordAttempts(pdfBuffer, filename, bankCode, userDetails);
      
    } catch (error: any) {
      console.error(`❌ Failed to process ${filename}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        attempts: 0,
      };
    }
  }

  /**
   * Try parsing PDF with different password combinations
   */
  private async parseWithPasswordAttempts(
    pdfBuffer: Buffer,
    filename: string,
    bankCode: string,
    userDetails?: UserDetails
  ): Promise<PDFProcessingResult> {
    const passwordAttempts = this.generatePasswordAttempts(userDetails);
    let lastError = '';

    console.log(`🔐 Trying ${passwordAttempts.length} password combinations for ${filename}`);

    for (let i = 0; i < passwordAttempts.length; i++) {
      const attempt = passwordAttempts[i];
      
      try {
        console.log(`🔑 Attempt ${i + 1}/${passwordAttempts.length}: ${attempt.password} (${attempt.source})`);
        
        const result = await this.tryParsePDF(pdfBuffer, filename, bankCode, attempt);
        
        if (result.success) {
          console.log(`✅ Success with password: ${attempt.password} (${attempt.source})`);
          return {
            success: true,
            data: result.data,
            passwordUsed: attempt.password,
            attempts: i + 1,
          };
        }
        
        lastError = result.error || 'Unknown error';
        
      } catch (error: any) {
        lastError = error.message;
        console.log(`❌ Failed with ${attempt.password}: ${lastError}`);
      }
    }

    console.log(`💥 All password attempts failed for ${filename}`);
    return {
      success: false,
      error: `Failed to decrypt PDF after ${passwordAttempts.length} attempts. Last error: ${lastError}`,
      attempts: passwordAttempts.length,
    };
  }

  /**
   * Generate password attempts based on user details
   */
  private generatePasswordAttempts(userDetails?: UserDetails): Array<{password: string, source: string}> {
    const attempts: Array<{password: string, source: string}> = [];

    // 1. Common defaults (try first)
    const commonPasswords = ['0000', '1234', 'password', '123456'];
    commonPasswords.forEach(pwd => {
      attempts.push({ password: pwd, source: 'common-default' });
    });

    // 2. Date of Birth variations (if provided)
    if (userDetails?.dob) {
      const dob = userDetails.dob;
      
      // DDMMYYYY -> DDMMYY
      if (dob.length === 8) {
        attempts.push({ password: dob, source: 'dob-full' });
        attempts.push({ password: dob.substring(0, 6), source: 'dob-yy' });
        attempts.push({ password: dob.substring(4), source: 'dob-year' });
      }
      
      // Try reverse
      attempts.push({ password: dob.split('').reverse().join(''), source: 'dob-reverse' });
    }

    // 3. Card number variations (if provided)
    if (userDetails?.cardNumbers) {
      userDetails.cardNumbers.forEach((cardNum, index) => {
        attempts.push({ password: cardNum, source: `card-${index + 1}` });
        
        // Try padded versions
        if (cardNum.length === 2) {
          attempts.push({ password: cardNum + '00', source: `card-${index + 1}-padded` });
          attempts.push({ password: '00' + cardNum, source: `card-${index + 1}-prefixed` });
        }
      });
    }

    // 4. Combination attempts
    if (userDetails?.dob && userDetails?.cardNumbers) {
      const dob = userDetails.dob;
      userDetails.cardNumbers.forEach((cardNum, index) => {
        attempts.push({ password: dob + cardNum, source: `dob+card-${index + 1}` });
        attempts.push({ password: cardNum + dob, source: `card-${index + 1}+dob` });
        
        if (dob.length >= 6) {
          attempts.push({ password: dob.substring(0, 6) + cardNum, source: `dob-yy+card-${index + 1}` });
        }
      });
    }

    return attempts;
  }

  /**
   * Try parsing PDF with a specific password
   */
  private async tryParsePDF(
    pdfBuffer: Buffer,
    filename: string,
    bankCode: string,
    attempt: {password: string, source: string}
  ): Promise<{success: boolean, data?: BoostScoreContentResponse, error?: string}> {
    
    console.log(`🔐 Trying BoostScore with password: "${attempt.password}" (${attempt.source})`);
    
    // Create upload payload
    const payload: BoostScoreUploadPayload = {
      name: 'Gmail Statement',
      dob: '01011990', // Default DOB (will be overridden by password attempts)
      bank: bankCode,
      card_no: '00', // Default card number
      pass_str: attempt.password,
    };

    console.log(`📤 Uploading to BoostScore with payload:`, {
      name: payload.name,
      bank: payload.bank,
      dob: payload.dob,
      card_no: payload.card_no,
      pass_str: '***hidden***',
      pdf_size: pdfBuffer.length
    });

    try {
      // Upload to BoostScore
      console.log(`⏳ Uploading to BoostScore...`);
      const uploadResponse = await this.boostScoreClient.uploadStatement(pdfBuffer, payload);
      
      console.log(`✅ Upload successful, ID: ${uploadResponse.id}, ETA: ${uploadResponse.processing_eta.value}${uploadResponse.processing_eta.unit}`);
      
      // Poll for completion
      console.log(`⏳ Polling for completion...`);
      const content = await this.boostScoreClient.pollStatementContent(uploadResponse.id);
      
      console.log(`📊 BoostScore response status: ${content.status}`);
      
      if (content.status === 'COMPLETED' && content.content) {
        console.log(`🎉 SUCCESS! PDF parsed with password: "${attempt.password}"`);
        return {
          success: true,
          data: content,
        };
      } else {
        console.log(`❌ BoostScore failed: ${content.error_message || 'Processing failed'}`);
        return {
          success: false,
          error: content.error_message || 'Processing failed',
        };
      }
      
    } catch (error: any) {
      console.log(`💥 BoostScore error:`, error.message);
      
      // Check if it's a password-related error
      if (error.message.includes('decrypt') || 
          error.message.includes('password') || 
          error.message.includes('invalid') ||
          error.status === 500) {
        console.log(`🔒 Password error detected: ${error.message}`);
        return {
          success: false,
          error: 'Invalid password',
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Extract card numbers from email subject/filename
   */
  static extractCardNumbers(subject: string, filename: string): string[] {
    const text = `${subject} ${filename}`.toLowerCase();
    const cardNumbers: string[] = [];

    // Look for patterns like "ending in 1234", "card ending 12", "****1234"
    const patterns = [
      /ending\s*(?:in)?\s*(\d{2,4})/gi,
      /(\d{4})\s*(?:ending|card)/gi,
      /\*{4,}(\d{2,4})/gi,
      /(\d{2,4})\*{4,}/gi,
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const numberMatch = match.match(/\d{2,4}/);
          if (numberMatch) {
            cardNumbers.push(numberMatch[0]);
          }
        });
      }
    });

    return [...new Set(cardNumbers)]; // Remove duplicates
  }

  /**
   * Extract DOB from user input or use defaults
   */
  static parseDOB(dobInput?: string): string | undefined {
    if (!dobInput) return undefined;
    
    // Try to parse various formats
    const cleanDob = dobInput.replace(/[^0-9]/g, '');
    
    if (cleanDob.length === 8) {
      // Already in DDMMYYYY format
      return cleanDob;
    } else if (cleanDob.length === 6) {
      // DDMMYY format - assume 19YY
      return cleanDob + '19' + cleanDob.substring(4);
    }
    
    return undefined;
  }
}
