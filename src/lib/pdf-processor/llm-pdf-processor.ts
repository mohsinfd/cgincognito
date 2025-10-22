/**
 * LLM-based PDF Processor
 * Replaces BoostScore with our own LLM parser
 */

import { GmailClient } from '@/lib/gmail/client';
import { LLMStatementParser } from '@/lib/parser-llm';
import type { BoostScoreContentResponse } from '@/types/boostscore';
import { mapTransactionCategory } from '@/lib/mapper/complete-mapper';

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

export class LLMPDFProcessor {
  private gmailClient: GmailClient;
  private llmParser: LLMStatementParser;

  constructor(gmailClient: GmailClient) {
    this.gmailClient = gmailClient;
    this.llmParser = new LLMStatementParser({
      openaiApiKey: process.env.OPENAI_API_KEY,
      maxCostPerStatement: 5, // ₹5 per statement
    });
  }

  /**
   * Process a single statement PDF with LLM
   */
  async processStatement(
    messageId: string,
    attachmentId: string,
    filename: string,
    bankCode: string,
    userDetails?: UserDetails,
    passwordRequirement?: any // PasswordRequirement from hint analysis
  ): Promise<PDFProcessingResult> {
    try {
      console.log(`📥 Downloading PDF: ${filename} (attachment_id: ${attachmentId})`);
      
      // 1. Download PDF from Gmail
      const pdfBuffer = await this.gmailClient.getAttachment(messageId, attachmentId);
      
      console.log(`📄 PDF downloaded: ${pdfBuffer.length} bytes`);
      
      if (pdfBuffer.length === 0) {
        throw new Error('Downloaded PDF is empty');
      }
      
      // 2. Try to parse with different password combinations using LLM
      return await this.parseWithPasswordAttempts(pdfBuffer, filename, bankCode, userDetails, passwordRequirement);
      
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
   * Try parsing PDF with different password combinations using LLM
   */
  private async parseWithPasswordAttempts(
    pdfBuffer: Buffer,
    filename: string,
    bankCode: string,
    userDetails?: UserDetails,
    passwordRequirement?: any
  ): Promise<PDFProcessingResult> {
    console.log(`📋 Received user details:`, JSON.stringify(userDetails, null, 2));
    console.log(`🎯 Password requirement:`, passwordRequirement ? `${passwordRequirement.format} (${passwordRequirement.confidence})` : 'none');
    
    const passwordAttempts = this.generatePasswordAttempts(userDetails, passwordRequirement, bankCode);

    // If a high/medium confidence requirement exists but we produced no attempts,
    // bail out with a concrete missing-fields message instead of brute forcing
    if (passwordRequirement && Array.isArray(passwordRequirement.fields) && passwordAttempts.length === 0) {
      const missing: string[] = [];
      const card: any = (userDetails as any)?.card || {};
      for (const f of passwordRequirement.fields as string[]) {
        if (f === 'name' && !userDetails?.name) missing.push('name');
        if (f === 'dob' && !userDetails?.dob) missing.push('dob');
        if (f === 'card_last6' && !card.last6) missing.push('card_last6');
        if (f === 'card_last4' && !card.last4) missing.push('card_last4');
      }
      if (missing.length > 0) {
        return {
          success: false,
          error: `Missing required fields for ${passwordRequirement.bankCode || 'bank'}: ${missing.join(', ')}`,
          attempts: 0,
        };
      }
    }
    let lastError = '';

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔐 Generated ${passwordAttempts.length} password combinations for ${filename}`);
    console.log(`📋 ALL PASSWORDS TO TRY:`);
    passwordAttempts.forEach((a, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(2)}. "${a.password}" (${a.source})`);
    });
    console.log(`${'='.repeat(80)}\n`);

    for (let i = 0; i < passwordAttempts.length; i++) {
      const attempt = passwordAttempts[i];
      
      try {
        console.log(`\n🔑 ATTEMPT ${i + 1}/${passwordAttempts.length}: "${attempt.password}" (${attempt.source})`);
        
        const result = await this.tryParseWithLLM(pdfBuffer, filename, bankCode, attempt);
        
        if (result.success) {
          console.log(`\n${'🎉'.repeat(40)}`);
          console.log(`✅ ✅ ✅ PASSWORD FOUND! ✅ ✅ ✅`);
          console.log(`   Password: "${attempt.password}"`);
          console.log(`   Source: ${attempt.source}`);
          console.log(`   Attempts needed: ${i + 1}/${passwordAttempts.length}`);
          console.log(`${'🎉'.repeat(40)}\n`);
          return {
            success: true,
            data: result.data,
            passwordUsed: attempt.password,
            attempts: i + 1,
          };
        }
        
        lastError = result.error || 'Unknown error';
        console.log(`   ❌ Failed: ${lastError}`);
        
      } catch (error: any) {
        lastError = error.message;
        console.log(`   ❌ Failed: ${lastError}`);
      }
    }

    console.log(`\n${'❌'.repeat(40)}`);
    console.log(`💥 ALL ${passwordAttempts.length} PASSWORD ATTEMPTS FAILED FOR ${filename.toUpperCase()}`);
    console.log(`\n📋 COMPLETE LIST OF PASSWORDS TRIED:`);
    passwordAttempts.forEach((a, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(2)}. "${a.password}" (${a.source})`);
    });
    console.log(`\n❓ Please check if the correct password is in this list.`);
    console.log(`${'❌'.repeat(40)}\n`);
    return {
      success: false,
      error: `Failed to decrypt PDF after ${passwordAttempts.length} attempts. Last error: ${lastError}`,
      attempts: passwordAttempts.length,
    };
  }

  /**
   * Try parsing PDF with LLM using a specific password
   */
  private async tryParseWithLLM(
    pdfBuffer: Buffer,
    filename: string,
    bankCode: string,
    attempt: {password: string, source: string}
  ): Promise<{success: boolean, data?: BoostScoreContentResponse, error?: string}> {
    
    console.log(`🤖 Trying LLM parser with password: "${attempt.password}" (${attempt.source})`);

    try {
      console.log(`🤖 Calling LLM parser with password: "${attempt.password}" for bank: ${bankCode}`);
      
      // Parse with LLM (this handles password attempts internally)
      const llmResult = await this.llmParser.parseStatement(pdfBuffer, {
        password: attempt.password,
        bank: bankCode,
      });

      if (llmResult.success && llmResult.content) {
        // Check if this is a decrypted PDF marker
        const text = llmResult.content?.transactions?.[0]?.description || '';
        const metadata = (llmResult.content as any)?.metadata;
        
        if (text.includes('[PDF_DECRYPTED_SUCCESSFULLY]') || metadata?.decryptedPath) {
          console.log(`🔄 Detected decrypted PDF marker, processing saved file...`);
          
          // Extract path from metadata or text
          const decryptedPath = metadata?.decryptedPath || 
            text.match(/Decrypted file saved to: (.+\.pdf)/)?.[1];
          
          if (decryptedPath) {
            console.log(`📂 Processing decrypted file: ${decryptedPath}`);
            
            // Use the decrypted processor
            const { DecryptedPDFProcessor } = await import('./decrypted-processor');
            const processor = new DecryptedPDFProcessor();
            const result = await processor.processDecryptedPDF(decryptedPath, bankCode, false);
            
            if (result.success) {
              console.log(`🎉 Successfully processed decrypted PDF!`);
              return {
                success: true,
                data: result.data,
              };
            } else {
              return {
                success: false,
                error: result.error || 'Failed to process decrypted PDF',
              };
            }
          }
        }
        
        // Normal flow - not a decrypted PDF marker
        const boostScoreFormat = this.convertLLMToBoostScoreFormat(llmResult.content, bankCode);
        
        console.log(`🎉 LLM SUCCESS! PDF parsed with password: "${attempt.password}"`);
        console.log(`💰 Cost: ₹${llmResult.cost.toFixed(4)}, Confidence: ${llmResult.confidence}%`);
        return {
          success: true,
          data: boostScoreFormat,
        };
      } else {
        console.log(`❌ LLM parsing failed: ${llmResult.error}`);
        return {
          success: false,
          error: llmResult.error || 'LLM parsing failed',
        };
      }
      
    } catch (error: any) {
      console.log(`💥 LLM error:`, error.message);
      
      // Check if it's a password-related error
      if (error.message.includes('decrypt') || 
          error.message.includes('password') || 
          error.message.includes('invalid') ||
          error.message.includes('encrypted')) {
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
   * Convert LLM parser output to BoostScore format for compatibility
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

  /**
   * Generate password attempts based on user details and password requirements
   * NEW: Enforces bank-specific rules, caps attempts at 10, blocks on missing fields
   */
  private generatePasswordAttempts(
    userDetails?: UserDetails,
    requirement?: any, // PasswordRequirement from hint analysis
    bankCode?: string
  ): Array<{password: string, source: string}> {
    const attempts: Array<{password: string, source: string}> = [];

    console.log(`🔐 Generating password attempts for user details:`, {
      hasName: !!userDetails?.name,
      nameLength: userDetails?.name?.length || 0,
      hasDob: !!userDetails?.dob,
      dobLength: userDetails?.dob?.length || 0,
      cardNumbers: userDetails?.cardNumbers || [],
      matchedCard: (userDetails as any)?.card ? (userDetails as any).card.last4 : 'none',
      requirement: requirement ? `${requirement.format} (${requirement.confidence})` : 'none',
      bankCode: bankCode || 'unknown',
    });

    // BANK-SPECIFIC ENFORCEMENT: Check required fields and block if missing
    const bankRules = this.getBankPasswordRules(bankCode);
    if (bankRules && bankRules.requiredFields) {
      const missingFields: string[] = [];
      const card = (userDetails as any)?.card || {};
      
      for (const field of bankRules.requiredFields) {
        if (field === 'name' && !userDetails?.name) missingFields.push('name');
        if (field === 'dob' && !userDetails?.dob) missingFields.push('dob');
        if (field === 'card_last4' && !card.last4) missingFields.push('card_last4');
        if (field === 'card_last6' && !card.last6) missingFields.push('card_last6');
      }
      
      if (missingFields.length > 0) {
        console.log(`❌ Missing required fields for ${bankCode}: ${missingFields.join(', ')}`);
        console.log(`🚫 Blocking processing. Please provide: ${missingFields.join(', ')}`);
        return []; // Return empty array to trigger the missing fields error
      }
    }

    // If we have password requirements, prioritize those fields
    if (requirement && requirement.fields && requirement.fields.length > 0) {
      console.log(`🎯 Prioritizing based on requirement: ${requirement.fields.join(', ')}`);
      
      // Generate targeted attempts based on requirements first
      const targetedAttempts = this.generateTargetedAttempts(userDetails, requirement, bankCode);
      attempts.push(...targetedAttempts);
      
      // If requirement is HIGH confidence and we generated attempts, limit to those ONLY
      if (requirement.confidence === 'high' && targetedAttempts.length > 0) {
        console.log(`⚡ High confidence requirement - limiting to ${targetedAttempts.length} targeted attempts`);
        return attempts.slice(0, 10); // Cap at 10 attempts
      }
    }

    // 1. Common defaults (try first)
    const commonPasswords = ['0000', '1234', 'password', '123456', '1111', '2222'];
    commonPasswords.forEach(pwd => {
      attempts.push({ password: pwd, source: 'common-default' });
    });

    // 2. Name-based passwords (if provided)
    if (userDetails?.name) {
      const name = userDetails.name.toUpperCase().replace(/[^A-Z\s]/g, '');
      console.log(`👤 Processing name: ${name}`);
      
      // Full name
      attempts.push({ password: name, source: 'name-full' });
      
      // Name without spaces
      const nameNoSpaces = name.replace(/\s+/g, '');
      if (nameNoSpaces !== name) {
        attempts.push({ password: nameNoSpaces, source: 'name-no-spaces' });
      }
      
      // First name only
      const firstName = name.split(' ')[0];
      if (firstName && firstName !== name) {
        attempts.push({ password: firstName, source: 'name-first' });
      }
      
      // Last name only
      const lastName = name.split(' ').slice(-1)[0];
      if (lastName && lastName !== name && lastName !== firstName) {
        attempts.push({ password: lastName, source: 'name-last' });
      }
      
      // First letter of each name
      const initials = name.split(' ').map(n => n[0]).join('');
      if (initials && initials.length > 1) {
        attempts.push({ password: initials, source: 'name-initials' });
      }
    }

    // 3. Date of Birth variations (if provided)
    if (userDetails?.dob) {
      const dob = userDetails.dob;
      console.log(`📅 Processing DOB: ${dob}`);
      
      if (dob.length === 8) {
        // DDMMYYYY format
        attempts.push({ password: dob, source: 'dob-full' });
        // DDMMYY = DD + MM + last 2 of YYYY (e.g., "15101985" → "151085")
        attempts.push({ password: dob.substring(0, 4) + dob.substring(6, 8), source: 'dob-ddmmyy' }); // DDMMYY
        attempts.push({ password: dob.substring(4), source: 'dob-year' }); // YYYY
        attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' }); // DDMM
      } else if (dob.length === 6) {
        // DDMMYY format
        attempts.push({ password: dob, source: 'dob-yy' });
        attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmmyy' }); // DDMM
        attempts.push({ password: dob.substring(4), source: 'dob-year' }); // YY
      } else {
        // Try as-is
        attempts.push({ password: dob, source: 'dob-as-is' });
      }
      
      // Try reverse
      attempts.push({ password: dob.split('').reverse().join(''), source: 'dob-reverse' });
    }

    // 4. Card number variations (PRIORITIZE matched card)
    const matchedCard = (userDetails as any)?.card;
    
    if (matchedCard?.last4) {
      console.log(`🎯 Processing MATCHED card: ${matchedCard.last4} (${matchedCard.bank_code})`);
      const cardNum = matchedCard.last4;
      
      // Matched card gets highest priority
      attempts.push({ password: cardNum, source: 'matched-card-last4' });
      attempts.push({ password: matchedCard.last2, source: 'matched-card-last2' });
      
      // Try padded versions
      attempts.push({ password: cardNum + '00', source: 'matched-card-padded' });
      attempts.push({ password: '00' + cardNum, source: 'matched-card-prefixed' });
    }
    
    // Then try other cards from user's registry (fallback)
    if (userDetails?.cardNumbers && userDetails.cardNumbers.length > 0) {
      userDetails.cardNumbers.forEach((cardNum, index) => {
        // Skip if this is the matched card (already tried above)
        if (matchedCard?.last4 && cardNum === matchedCard.last4) {
          return;
        }
        
        console.log(`💳 Processing fallback card ${index + 1}: ${cardNum}`);
        
        attempts.push({ password: cardNum, source: `fallback-card-${index + 1}` });
        
        // Try padded versions for 2-digit numbers
        if (cardNum.length === 2) {
          attempts.push({ password: cardNum + '00', source: `fallback-card-${index + 1}-padded` });
          attempts.push({ password: '00' + cardNum, source: `fallback-card-${index + 1}-prefixed` });
        }
        
        // Try padded versions for 4-digit numbers
        if (cardNum.length === 4) {
          attempts.push({ password: cardNum + '00', source: `fallback-card-${index + 1}-padded-6` });
          attempts.push({ password: '00' + cardNum, source: `fallback-card-${index + 1}-prefixed-6` });
        }
      });
    }

    // 5. Combination attempts
    if (userDetails?.name && userDetails?.dob) {
      const name = userDetails.name.toUpperCase().replace(/[^A-Z\s]/g, '');
      const dob = userDetails.dob;
      
      // Name + DOB combinations
      attempts.push({ password: name + dob, source: 'name+dob' });
      attempts.push({ password: dob + name, source: 'dob+name' });
      
      // First name + DOB
      const firstName = name.split(' ')[0];
      if (firstName && firstName !== name) {
        attempts.push({ password: firstName + dob, source: 'firstname+dob' });
        attempts.push({ password: dob + firstName, source: 'dob+firstname' });
      }
      
      // Last name + DOB
      const lastName = name.split(' ').slice(-1)[0];
      if (lastName && lastName !== name && lastName !== firstName) {
        attempts.push({ password: lastName + dob, source: 'lastname+dob' });
        attempts.push({ password: dob + lastName, source: 'dob+lastname' });
      }
    }

    if (userDetails?.name && userDetails?.cardNumbers && userDetails.cardNumbers.length > 0) {
      const name = userDetails.name.toUpperCase().replace(/[^A-Z\s]/g, '');
      userDetails.cardNumbers.forEach((cardNum, index) => {
        // Name + Card combinations
        attempts.push({ password: name + cardNum, source: `name+card-${index + 1}` });
        attempts.push({ password: cardNum + name, source: `card-${index + 1}+name` });
        
        // First name + Card
        const firstName = name.split(' ')[0];
        if (firstName && firstName !== name) {
          attempts.push({ password: firstName + cardNum, source: `firstname+card-${index + 1}` });
          attempts.push({ password: cardNum + firstName, source: `card-${index + 1}+firstname` });
        }
      });
    }

    if (userDetails?.dob && userDetails?.cardNumbers && userDetails.cardNumbers.length > 0) {
      const dob = userDetails.dob;
      userDetails.cardNumbers.forEach((cardNum, index) => {
        // DOB + Card combinations
        attempts.push({ password: dob + cardNum, source: `dob+card-${index + 1}` });
        attempts.push({ password: cardNum + dob, source: `card-${index + 1}+dob` });
        
        // Try DDMMYY + card combinations
        if (dob.length === 8) {
          const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // "15101985" → "151085"
          attempts.push({ password: ddmmyy + cardNum, source: `dob-ddmmyy+card-${index + 1}` });
        }
        
        // Try DDMM + card combinations
        if (dob.length >= 4) {
          attempts.push({ password: dob.substring(0, 4) + cardNum, source: `dob-ddmm+card-${index + 1}` });
        }
      });
    }

    console.log(`🔐 Generated ${attempts.length} password attempts`);
    console.log(`📝 Full password list:`);
    attempts.forEach((a, i) => {
      console.log(`   ${i + 1}. "${a.password}" (${a.source})`);
    });
    // Cap attempts per statement to avoid brute force
    const maxAttemptsRules = this.getBankPasswordRules(bankCode);
    const maxAttempts = maxAttemptsRules?.maxAttempts || 10;
    return attempts.slice(0, maxAttempts);
  }

  /**
   * Get bank-specific password rules
   */
  private getBankPasswordRules(bankCode?: string): {requiredFields?: string[], maxAttempts?: number} | null {
    const rules: Record<string, {requiredFields: string[], maxAttempts: number}> = {
      'hsbc': { requiredFields: ['dob', 'card_last6'], maxAttempts: 10 },
      'hdfc': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'axis': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'rbl': { requiredFields: ['dob'], maxAttempts: 6 },
      'idfc': { requiredFields: ['dob'], maxAttempts: 4 },
      'sbi': { requiredFields: ['dob', 'card_last4'], maxAttempts: 8 },
      'yes': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'icici': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'indusind': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
    };
    
    return bankCode ? rules[bankCode.toLowerCase()] || null : null;
  }

  /**
   * Generate targeted password attempts based on email requirements
   * FIXED: Now matches the exact logic from working scripts
   */
  private generateTargetedAttempts(
    userDetails?: UserDetails,
    requirement?: any,
    bankCode?: string
  ): Array<{password: string, source: string}> {
    const attempts: Array<{password: string, source: string}> = [];
    
    if (!requirement || !requirement.fields) return attempts;
    
    console.log(`🎯 Generating targeted attempts for bank: ${bankCode}, fields: ${requirement.fields.join(', ')}`);
    
    // Generate attempts based on required fields
    for (const field of requirement.fields) {
      switch (field) {
        case 'dob':
          if (userDetails?.dob) {
            const dob = userDetails.dob;
            attempts.push({ password: dob, source: 'targeted-dob-full' });
            if (dob.length === 8) {
              // DDMMYY = DD + MM + last 2 digits of YYYY
              const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // "15101985" → "151085"
              attempts.push({ password: ddmmyy, source: 'targeted-dob-ddmmyy' });
              attempts.push({ password: dob.substring(0, 4), source: 'targeted-dob-ddmm' });
            }
          }
          break;
          
        case 'name':
          if (userDetails?.name) {
            const name = userDetails.name.toUpperCase().replace(/[^A-Z\s]/g, '');
            // First 4 letters (HDFC style)
            const first4 = name.replace(/\s/g, '').substring(0, 4);
            if (first4.length === 4) {
              attempts.push({ password: first4, source: 'targeted-name-first4' });
            }
            // Full name variations
            attempts.push({ password: name, source: 'targeted-name-full' });
            attempts.push({ password: name.replace(/\s+/g, ''), source: 'targeted-name-no-spaces' });
            
            const firstName = name.split(' ')[0];
            if (firstName) {
              attempts.push({ password: firstName, source: 'targeted-name-first' });
            }
          }
          break;
          
        case 'card_last6':
          // HSBC uses last 6 digits - FIXED: Use actual card number from user input
          const matchedCard6 = (userDetails as any)?.card;
          if (matchedCard6?.last6) {
            attempts.push({ password: matchedCard6.last6, source: 'targeted-matched-card6' });
          }
          // Try other cards from user input
          if (userDetails?.cardNumbers) {
            userDetails.cardNumbers.forEach((cardNum, index) => {
              // For HSBC, we need the actual last 6 digits, not padded
              if (cardNum.length >= 6) {
                const last6 = cardNum.slice(-6);
                if (last6 !== matchedCard6?.last6) {
                  attempts.push({ password: last6, source: `targeted-fallback-card6-${index + 1}` });
                }
              }
            });
          }
          break;
          
        case 'card_last4':
          // Prioritize matched card
          const matchedCard4 = (userDetails as any)?.card;
          if (matchedCard4?.last4) {
            attempts.push({ password: matchedCard4.last4, source: 'targeted-matched-card4' });
          }
          // Then try other cards
          if (userDetails?.cardNumbers) {
            userDetails.cardNumbers.forEach((cardNum, index) => {
              if (cardNum.length >= 4 && cardNum !== matchedCard4?.last4) {
                attempts.push({ password: cardNum, source: `targeted-fallback-card4-${index + 1}` });
              }
            });
          }
          break;
          
        case 'card_last2':
          // Prioritize matched card
          const matchedCard2 = (userDetails as any)?.card;
          if (matchedCard2?.last2) {
            attempts.push({ password: matchedCard2.last2, source: 'targeted-matched-card2' });
          }
          // Then try other cards
          if (userDetails?.cardNumbers) {
            userDetails.cardNumbers.forEach((cardNum, index) => {
              if (cardNum.length >= 2) {
                const last2 = cardNum.slice(-2);
                if (last2 !== matchedCard2?.last2) {
                  attempts.push({ password: last2, source: `targeted-fallback-card2-${index + 1}` });
                }
              }
            });
          }
          break;
          
      }
    }
    
    // Generate combinations if multiple fields are required
    if (requirement.fields.length > 1 && userDetails) {
      // HSBC: DDMMYY + last 6 digits - FIXED: Use actual card number
      if (requirement.fields.includes('dob') && requirement.fields.includes('card_last6')) {
        if (userDetails.dob) {
          const matchedCardCombo = (userDetails as any)?.card;
          // Convert DDMMYYYY → DDMMYY (DD + MM + last 2 of YYYY)
          const dobYY = userDetails.dob.length === 8 
            ? userDetails.dob.substring(0, 4) + userDetails.dob.substring(6, 8) 
            : userDetails.dob;
          
          // Prioritize matched card for combinations
          if (matchedCardCombo?.last6) {
            const cardNum = matchedCardCombo.last6;
            
            attempts.push({ 
              password: dobYY + cardNum, 
              source: 'targeted-ddmmyy+matched-card6' 
            });
          }
          
          // Then try fallback cards (if user provided 6 digits)
          if (userDetails.cardNumbers) {
            userDetails.cardNumbers.forEach((cardNum, index) => {
              // Skip matched card (already tried)
              if (matchedCardCombo?.last6 && cardNum === matchedCardCombo.last6) {
                return;
              }
              
              if (cardNum.length >= 6) {
                const last6 = cardNum.slice(-6);
                attempts.push({ 
                  password: dobYY + last6, 
                  source: `targeted-ddmmyy+fallback-card6-${index + 1}` 
                });
              }
            });
          }
        }
      }
      
      // Standard banks: DOB + last 4 digits
      if (requirement.fields.includes('dob') && requirement.fields.includes('card_last4')) {
        if (userDetails.dob) {
          const matchedCardCombo = (userDetails as any)?.card;
          
          // Prioritize matched card for combinations
          if (matchedCardCombo?.last4) {
            const cardNum = matchedCardCombo.last4;
            
            attempts.push({ 
              password: userDetails.dob + cardNum, 
              source: 'targeted-dob+matched-card4' 
            });
            
            if (userDetails.dob.length >= 4) {
              attempts.push({ 
                password: userDetails.dob.substring(0, 4) + cardNum, 
                source: 'targeted-ddmm+matched-card4' 
              });
            }
          }
          
          // Then try fallback cards
          if (userDetails.cardNumbers) {
            userDetails.cardNumbers.forEach((cardNum, index) => {
              // Skip matched card (already tried)
              if (matchedCardCombo?.last4 && cardNum === matchedCardCombo.last4) {
                return;
              }
              
              if (cardNum.length >= 4) {
                attempts.push({ 
                  password: userDetails.dob + cardNum, 
                  source: `targeted-dob+fallback-card4-${index + 1}` 
                });
                
                if (userDetails.dob.length >= 4) {
                  attempts.push({ 
                    password: userDetails.dob.substring(0, 4) + cardNum, 
                    source: `targeted-ddmm+fallback-card4-${index + 1}` 
                  });
                }
              }
            });
          }
        }
      }
      
      // HDFC: Name + Card (first 4 letters + last 4 digits)
      if (requirement.fields.includes('name') && requirement.fields.includes('card_last4')) {
        if (userDetails.name) {
          const name = userDetails.name.toUpperCase().replace(/[^A-Z\s]/g, '');
          const first4 = name.replace(/\s/g, '').substring(0, 4);
          
          if (first4.length === 4) {
            // Try matched card first
            const matchedCardCombo = (userDetails as any)?.card;
            if (matchedCardCombo?.last4) {
              attempts.push({ 
                password: first4 + matchedCardCombo.last4, 
                source: 'targeted-hdfc-first4+matched-card4' 
              });
            }
            
            // Try fallback cards
            if (userDetails.cardNumbers) {
              userDetails.cardNumbers.forEach((cardNum, index) => {
                if (cardNum.length >= 4 && cardNum !== matchedCardCombo?.last4) {
                  attempts.push({ 
                    password: first4 + cardNum, 
                    source: `targeted-hdfc-first4+fallback-card4-${index + 1}` 
                  });
                }
              });
            }
          }
        }
      }
      
      // HDFC: Name + DDMM (first 4 letters + date/month)
      if (requirement.fields.includes('name') && requirement.fields.includes('dob')) {
        if (userDetails.name && userDetails.dob) {
          const name = userDetails.name.toUpperCase().replace(/[^A-Z\s]/g, '');
          const first4 = name.replace(/\s/g, '').substring(0, 4);
          
          if (first4.length === 4) {
            // Try DDMM format (HDFC style)
            if (userDetails.dob.length >= 4) {
              const ddmm = userDetails.dob.substring(0, 4);
              attempts.push({ 
                password: first4 + ddmm, 
                source: 'targeted-hdfc-first4+ddmm' 
              });
            }
            
            // Fallback to full name combinations
            attempts.push({ 
              password: name + userDetails.dob, 
              source: 'targeted-name+dob' 
            });
            attempts.push({ 
              password: userDetails.dob + name, 
              source: 'targeted-dob+name' 
            });
          }
        }
      }
    }
    
    console.log(`🎯 Generated ${attempts.length} targeted attempts based on requirements`);
    return attempts;
  }

  /**
   * Extract card numbers from email subject/filename (same as before)
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
}
