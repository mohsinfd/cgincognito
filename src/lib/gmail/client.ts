/**
 * Gmail API client for fetching statements
 * Based on PRD Section F
 */

import { google } from 'googleapis';
import type { GmailMessage, GmailAttachment } from '@/types/gmail';
import { GMAIL_QUERIES } from '@/types/gmail';
import { createOAuth2Client } from './oauth';

export class GmailClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Get authenticated Gmail API client
   */
  private getGmailClient() {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: this.accessToken });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Search messages by query
   * @param query Gmail search query
   * @param afterDate Optional: only messages after this date (ISO string)
   * @returns List of message IDs
   */
  async searchMessages(query: string, afterDate?: string): Promise<GmailMessage[]> {
    const gmail = this.getGmailClient();

    let fullQuery = query;
    if (afterDate) {
      // Convert to Gmail date format (YYYY/MM/DD)
      const date = new Date(afterDate);
      const gmailDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      fullQuery += ` after:${gmailDate}`;
    }

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: fullQuery,
      maxResults: 50, // Limit for performance
    });

    return response.data.messages || [];
  }

  /**
   * Get message details including attachment metadata
   */
  async getMessage(messageId: string): Promise<any> {
    const gmail = this.getGmailClient();

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return response.data;
  }

  /**
   * Extract email body text from Gmail message
   */
  async getEmailBody(messageId: string): Promise<string> {
    try {
      const message = await this.getMessage(messageId);
      
      // Function to decode base64 content
      const decodeBase64 = (data: string): string => {
        try {
          return Buffer.from(data, 'base64').toString('utf-8');
        } catch {
          return '';
        }
      };

      // Function to extract text from message parts
      const extractTextFromParts = (parts: any[]): string => {
        let text = '';
        
        for (const part of parts) {
          if (part.parts) {
            // Recursive for nested parts
            text += extractTextFromParts(part.parts);
          } else if (part.mimeType === 'text/plain' && part.body?.data) {
            text += decodeBase64(part.body.data) + '\n';
          } else if (part.mimeType === 'text/html' && part.body?.data && !text) {
            // Use HTML as fallback if no plain text
            const htmlContent = decodeBase64(part.body.data);
            // Basic HTML to text conversion (remove tags)
            text += htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() + '\n';
          }
        }
        
        return text;
      };

      let emailBody = '';

      if (message.payload?.parts) {
        // Multipart message
        emailBody = extractTextFromParts(message.payload.parts);
      } else if (message.payload?.body?.data) {
        // Single part message
        emailBody = decodeBase64(message.payload.body.data);
      }

      // Clean up the text
      emailBody = emailBody
        .replace(/\r\n/g, '\n')
        .replace(/\n+/g, '\n')
        .trim();

      console.log(`📧 Extracted ${emailBody.length} characters from email body`);
      return emailBody;

    } catch (error) {
      console.error(`Failed to extract email body for ${messageId}:`, error);
      return '';
    }
  }

  /**
   * Get attachment data
   */
  async getAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    const gmail = this.getGmailClient();

    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });

    if (!response.data.data) {
      throw new Error('Attachment data not found');
    }

    // Decode base64url to buffer
    const base64Data = response.data.data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64Data, 'base64');
  }

  /**
   * List attachments from a message
   */
  async listAttachments(messageId: string): Promise<GmailAttachment[]> {
    const message = await this.getMessage(messageId);

    const attachments: GmailAttachment[] = [];

    if (message.payload?.parts) {
      for (const part of message.payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            message_id: messageId,
            attachment_id: part.body.attachmentId,
            filename: part.filename,
            mime_type: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0,
          });
        }
      }
    }

    return attachments;
  }

  /**
   * Search for statement emails from all configured banks
   * @param afterDate Optional: only messages after this date
   * @param maxMessagesPerBank Limit messages per bank (default: 5 for latest statements)
   */
  async searchAllStatements(afterDate?: string, maxMessagesPerBank: number = 5): Promise<{ bank_code: string; messages: GmailMessage[]; subject: string; from: string; date: string; attachments: any[] }[]> {
    // Default to last 6 months if no date specified
    const defaultAfterDate = afterDate || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    // Use broad search that actually works
    const broadQuery = '"credit card" statement has:attachment';
    
    console.log('🔍 Searching Gmail with query:', broadQuery);
    const allMessages = await this.searchMessages(broadQuery, defaultAfterDate);
    console.log(`📧 Found ${allMessages.length} potential statements`);

    // Group by bank and filter
    const bankMap = new Map<string, any[]>();

    for (const msg of allMessages) {
      try {
        const details = await this.getMessage(msg.id!);
        const subject = details.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '';
        const from = details.payload?.headers?.find((h: any) => h.name === 'From')?.value || '';
        const date = details.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '';
        
        // Check if it's a credit card statement
        if (!this.isStatementEmail(subject, from)) {
          console.log(`⏭️ Skipping non-statement: ${subject}`);
          continue;
        }

        // Determine bank
        const bankCode = this.detectBankFromEmail(from, subject);
        if (!bankCode) {
          console.log(`⚠️ Unknown bank in from: ${from}`);
          continue;
        }

        // Get attachments
        const attachments = await this.listAttachments(msg.id!);
        
        if (!bankMap.has(bankCode)) {
          bankMap.set(bankCode, []);
        }

        const existingStatements = bankMap.get(bankCode)!;
        if (existingStatements.length < maxMessagesPerBank) {
          // Extract email body for password hint analysis
          const emailBody = await this.getEmailBody(msg.id!);
          
          existingStatements.push({
            message: msg,
            subject,
            from,
            date,
            attachments,
            emailBody, // NEW: Include email body
          });
          console.log(`✅ Added ${bankCode} statement: ${subject}`);
        }
      } catch (error) {
        console.error(`Error processing message ${msg.id}:`, error);
      }
    }

    // Convert map to result array
    const results: any[] = [];
    for (const [bank_code, statements] of bankMap.entries()) {
      if (statements.length > 0) {
        // Return the latest statement's full details
        const latest = statements[0];
        results.push({
          bank_code,
          messages: statements.map(s => ({
            ...s.message,
            attachments: s.attachments,
            subject: s.subject,
            from: s.from,
            date: s.date,
            emailBody: s.emailBody,
          })),
          subject: latest.subject,
          from: latest.from,
          date: latest.date,
          attachments: latest.attachments,
          emailBody: latest.emailBody, // Include email body for password hint analysis
        });
      }
    }

    console.log(`🎯 Final result: ${results.length} banks with statements`);
    return results;
  }

  /**
   * Detect bank code from email address
   */
  private detectBankFromEmail(from: string, subject?: string): string | null {
    const fromLower = from.toLowerCase();
    const subjectLower = subject?.toLowerCase() || '';
    
    const bankPatterns: { pattern: string; code: string; checkSubject?: boolean }[] = [
      { pattern: 'hdfcbank', code: 'hdfc' },
      { pattern: 'sbicard', code: 'sbi' },
      { pattern: 'icicibank', code: 'icici' },
      { pattern: 'axisbank', code: 'axis' },
      { pattern: 'kotak', code: 'kotak' },
      { pattern: 'hsbc.co.in', code: 'hsbc' },
      { pattern: 'sc.com', code: 'sc' },
      { pattern: 'citibank', code: 'citi' },
      { pattern: 'indusind', code: 'indusind' },
      { pattern: 'yesbank', code: 'yes' },
      { pattern: 'rblbank', code: 'rbl' },
      { pattern: 'idfcfirstbank', code: 'idfc' },
      { pattern: 'federalbank', code: 'federal' },
      { pattern: 'onecard', code: 'onecard' },
      { pattern: 'jupiter', code: 'jupiter' },
      // Subject line patterns for better detection
      { pattern: 'magnus', code: 'axis', checkSubject: true },
      { pattern: 'flipkart.*axis', code: 'axis', checkSubject: true },
      { pattern: 'axis.*magnus', code: 'axis', checkSubject: true },
      { pattern: 'axis.*flipkart', code: 'axis', checkSubject: true },
      { pattern: 'hdfc.*regalia', code: 'hdfc', checkSubject: true },
      { pattern: 'sbi.*cashback', code: 'sbi', checkSubject: true },
      { pattern: 'cashback.*sbi', code: 'sbi', checkSubject: true },
      { pattern: 'yes.*klick', code: 'yes', checkSubject: true },
    ];

    for (const { pattern, code, checkSubject } of bankPatterns) {
      const textToCheck = checkSubject ? subjectLower : fromLower;
      if (pattern.includes('.*')) {
        // Use regex for patterns with wildcards
        const regex = new RegExp(pattern, 'i');
        if (regex.test(textToCheck)) {
          return code;
        }
      } else {
        // Use simple includes for exact matches
        if (textToCheck.includes(pattern)) {
          return code;
        }
      }
    }

    return null;
  }

  /**
   * Check if an email is likely a credit card statement
   */
  private isStatementEmail(subject: string, from: string): boolean {
    const subjectLower = subject.toLowerCase();
    const fromLower = from.toLowerCase();
    
    // Must be from a bank domain
    const bankDomains = [
      'hdfcbank', 'icicibank', 'axisbank', 'sbicard', 'kotak',
      'hsbc.co.in', 'sc.com', 'citibank', 'indusind', 'yesbank',
      'rblbank', 'idfcfirstbank', 'federalbank', 'onecard', 'jupiter'
    ];
    
    const isFromBank = bankDomains.some(domain => fromLower.includes(domain));
    
    if (!isFromBank) return false;
    
    // Skip obvious non-statements
    const skipKeywords = [
      'terms and conditions',
      'keyfact',
      'everything you need to know',
      'welcome to',
      'activation',
      'your pin',
      'otp',
      'verification code',
      'promotional',
      'special offer',
      'reward points',
      'cashback offer',
      'amortization schedule', // Skip EMI schedules
      'emi transaction',
      'funds/securities', // Skip investment statements
      'mutual fund', // Skip mutual fund statements
      'demat account',
      'trading account',
      'folio',
      'bill for your', // Skip utility bills
      'insurance renewal',
      'policy document'
    ];
    
    const hasSkipKeyword = skipKeywords.some(keyword => subjectLower.includes(keyword));
    
    if (hasSkipKeyword) return false;
    
    // Look for credit card specific indicators - these are HIGH confidence
    const creditCardIndicators = [
      'credit card statement',
      'card statement',
      'card ending',
      'cc statement',
      'credit card e-statement'
    ];
    
    const hasCreditCardIndicator = creditCardIndicators.some(indicator => subjectLower.includes(indicator));
    
    // If it has credit card indicators, it's definitely a credit card statement
    if (hasCreditCardIndicator) return true;
    
    // Otherwise require generic statement keywords
    const hasStatementKeyword = subjectLower.includes('statement') || subjectLower.includes('e-statement');
    if (!hasStatementKeyword) return false;

    // For generic "statement" emails, check if it's NOT a bank account statement
    // We want to EXCLUDE bank account statements and ONLY include credit card statements
    const bankAccountKeywords = [
      'bank account statement',
      'savings account',
      'account statement',
      'money quotient', // Axis Bank savings account
      'saving bank'
    ];
    
    const isBankAccountStatement = bankAccountKeywords.some(keyword => subjectLower.includes(keyword));
    
    // Exclude bank account statements - we only want credit card statements
    if (isBankAccountStatement) return false;
    
    // At this point, it has "statement" in the subject, is from a bank, and is not excluded
    // This catches cases like "Your Statement" or "Monthly Statement" from credit card emails
    return true;
  }

  /**
   * Apply label to message
   */
  async applyLabel(messageId: string, labelName: string): Promise<void> {
    const gmail = this.getGmailClient();

    // Get or create label
    const labels = await gmail.users.labels.list({ userId: 'me' });
    let labelId = labels.data.labels?.find(l => l.name === labelName)?.id;

    if (!labelId) {
      // Create label
      const newLabel = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });
      labelId = newLabel.data.id;
    }

    if (!labelId) {
      throw new Error('Failed to get or create label');
    }

    // Apply label
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
  }
}

