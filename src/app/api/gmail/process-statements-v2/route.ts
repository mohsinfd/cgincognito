/**
 * POST /api/gmail/process-statements-v2
 * Process selected statements using the proven script method (qpdf + standalone extraction)
 * This is a v2 API that uses the same approach as test-single-pdf.js
 */

import { NextRequest, NextResponse } from 'next/server';
import { GmailClient } from '@/lib/gmail/client';
import { 
  matchStatementToCard, 
  buildEnhancedUserDetails
} from '@/lib/utils/card-matcher';
import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

// Bank-specific password generation rules (updated for card registry)
const BANK_PASSWORD_RULES = {
  'hsbc': {
    requiredFields: ['name', 'dob', 'card_last6'],
    generatePasswords: (userDetails: any, bankCode: string) => {
      const attempts = [];
      const dob = userDetails.dob;
      
      // Find the specific card for this bank
      const card = userDetails.cards?.find((c: any) => c.bank_code === bankCode);
      const cardLast6 = card?.last6;
      
      if (dob && cardLast6) {
        // DDMMYY format: DDMM + YY (last 2 digits of year)
        const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // 151085
        
        attempts.push({ password: dob, source: 'dob-full' });
        attempts.push({ password: dob.substring(0, 6), source: 'dob-yy' });
        attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' });
        attempts.push({ password: cardLast6, source: 'card-last6' });
        attempts.push({ password: ddmmyy + cardLast6, source: 'ddmmyy+card6' });
      }
      return attempts;
    }
  },
  'hdfc': {
    requiredFields: ['name', 'dob'],
    generatePasswords: (userDetails: any, _bankCode: string) => {
      const attempts = [];
      const name4 = userDetails.name?.substring(0, 4).toUpperCase();
      const dob = userDetails.dob;
      
      if (name4 && dob) {
        attempts.push({ password: name4 + dob, source: 'name4+dob' });
        attempts.push({ password: name4 + dob.substring(0, 4), source: 'name4+ddmm' });
      }
      return attempts;
    }
  },
  'axis': {
    requiredFields: ['name', 'dob'],
    generatePasswords: (userDetails: any, _bankCode: string) => {
      const attempts = [];
      const name4 = userDetails.name?.substring(0, 4).toUpperCase();
      const dob = userDetails.dob;
      
      if (name4 && dob) {
        attempts.push({ password: name4 + dob.substring(0, 4), source: 'name4+ddmm' });
      }
      return attempts;
    }
  },
  'rbl': {
    requiredFields: ['name', 'dob'],
    generatePasswords: (userDetails: any, _bankCode: string) => {
      const attempts = [];
      const name4 = userDetails.name?.substring(0, 4).toUpperCase();
      const dob = userDetails.dob;
      
      if (name4 && dob) {
        // RBL uses: First 4 letters of name + DDMMYY
        const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // DDMM + YY
        attempts.push({ password: name4 + ddmmyy, source: 'name4+ddmmyy' });
        
        // Also try other variations
        attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' });
        attempts.push({ password: dob, source: 'dob-full' });
      }
      return attempts;
    }
  },
  'idfc': {
    requiredFields: ['dob'],
    generatePasswords: (userDetails: any, _bankCode: string) => {
      const attempts = [];
      const dob = userDetails.dob;
      
      if (dob) {
        attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' });
      }
      return attempts;
    }
  },
  'sbi': {
    requiredFields: ['dob', 'card_last4'],
    generatePasswords: (userDetails: any, bankCode: string) => {
      const attempts = [];
      const dob = userDetails.dob;
      
      // Find the specific card for this bank
      const card = userDetails.cards?.find((c: any) => c.bank_code === bankCode);
      const cardLast4 = card?.last4;
      
      if (dob && cardLast4) {
        // SBI format: DDMMYYYYLast4digits
        attempts.push({ password: dob + cardLast4, source: 'dob-full+card-last4' }); // 151019854158
        // Also try the old formats as fallbacks
        attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' }); // 1510
        attempts.push({ password: cardLast4, source: 'card-last4' }); // 4158
      }
      return attempts;
    }
  },
  'yes': {
    requiredFields: ['name', 'dob'],
    generatePasswords: (userDetails: any, _bankCode: string) => {
      const attempts = [];
      const name4 = userDetails.name?.substring(0, 4).toUpperCase();
      const dob = userDetails.dob;
      
      if (name4 && dob) {
        attempts.push({ password: name4 + dob.substring(0, 4), source: 'name4+ddmm' });
      }
      return attempts;
    }
  },
  'icici': {
    requiredFields: ['name', 'dob'],
    generatePasswords: (userDetails: any, _bankCode: string) => {
      const attempts = [];
      const name4 = userDetails.name?.substring(0, 4).toUpperCase();
      const dob = userDetails.dob;
      
      if (name4 && dob) {
        attempts.push({ password: name4 + dob.substring(0, 4), source: 'name4+ddmm' });
      }
      return attempts;
    }
  },
  'indusind': {
    requiredFields: ['name', 'dob'],
    generatePasswords: (userDetails: any, _bankCode: string) => {
      const attempts = [];
      const name4 = userDetails.name?.substring(0, 4).toUpperCase();
      const dob = userDetails.dob;
      
      if (name4 && dob) {
        attempts.push({ password: name4 + dob.substring(0, 4), source: 'name4+ddmm' });
      }
      return attempts;
    }
  },
  'aubank': {
    requiredFields: ['name', 'dob'],
    generatePasswords: (userDetails: any, _bankCode: string) => {
      const attempts = [];
      const name = userDetails.name || '';
      const dob = userDetails.dob || '';
      
      // AU Bank: First 4 letters of name + DDMM (date & month of birth)
      if (name.length >= 4 && dob.length >= 8) {
        const name4 = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
        const ddmm = dob.substring(0, 4); // DDMM
        attempts.push({ password: name4 + ddmm, source: 'aubank-name4+ddmm' });
      }
      
      // Fallback: try DDMMYY format
      if (name.length >= 4 && dob.length >= 8) {
        const name4 = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
        const ddmmyy = dob.substring(0, 6); // DDMMYY
        attempts.push({ password: name4 + ddmmyy, source: 'aubank-name4+ddmmyy' });
      }
      
      return attempts;
    }
  }
};

// Direct qpdf decryption (same as test-single-pdf.js)
function tryQpdfDecryption(pdfBuffer: Buffer, password: string): { success: boolean; decryptedPath?: string; error?: string } {
  try {
    const tempDir = join(process.cwd(), 'temp-decrypted');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    
    const decryptedPath = join(tempDir, `v2-decrypted-${Date.now()}.pdf`);
    const qpdfPath = 'C:\\Program Files (x86)\\qpdf 12.2.0\\bin\\qpdf.exe';
    
    // Write PDF buffer to temporary file
    const tempInputPath = join(tempDir, `temp-input-${Date.now()}.pdf`);
    writeFileSync(tempInputPath, pdfBuffer);
    
    const result = spawnSync(qpdfPath, [
      '--password=' + password,
      '--decrypt',
      tempInputPath,
      decryptedPath
    ], { encoding: 'utf-8' });
    
    // Clean up temp input file
    if (existsSync(tempInputPath)) {
      unlinkSync(tempInputPath);
    }
    
    if (result.status === 0 || result.status === 3) { // 3 = success with warnings
      return { success: true, decryptedPath };
    } else {
      return { success: false, error: result.stderr || 'qpdf failed' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Standalone text extraction (same as test-single-pdf.js)
function extractTextFromDecryptedPDF(decryptedPath: string): { success: boolean; text?: string; error?: string } {
  try {
    const extractorPath = join(process.cwd(), 'scripts', 'extract-text.js');
    const result = spawnSync(process.execPath, [extractorPath, decryptedPath], { 
      encoding: 'utf-8',
      timeout: 30000
    });
    
    if (result.status === 0) {
      try {
        const parsed = JSON.parse(result.stdout);
        return { success: true, text: parsed.text || '' };
      } catch (error: any) {
        return { success: false, error: 'JSON parsing failed' };
      }
    } else {
      return { success: false, error: 'Text extraction failed' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// OpenAI parsing using proper LLM parser
async function parseWithOpenAI(text: string, bankCode: string): Promise<{ success: boolean; transactionCount?: number; data?: any; error?: string }> {
  try {
    // Use OpenAI directly for text parsing (since we already have extracted text)
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `You are an expert credit card statement parser for Indian credit cards. Extract ALL transaction data accurately.

**Bank:** ${bankCode}

**STATEMENT TEXT:**
\`\`\`
${text}
\`\`\`

**CRITICAL INSTRUCTIONS:**

1. **EXCLUDE BANK FEES AND CHARGES - DO NOT INCLUDE THESE:**
   - Finance charges, interest charges, late payment fees
   - Annual fees, membership fees (and their GST/tax components)
   - GST/IGST/CGST/SGST on ANY charges (including "ASSESSMENT", "TAX ON", etc.)
   - Over-limit fees, processing fees, service charges
   - Cashback credits, reward credits, fee reversals/discounts
   - Descriptors to EXCLUDE: "FIN CHGS", "FINANCE CHARGE", "INTEREST", "LATE FEE", "ANNUAL FEE", "MEMBERSHIP FEE", "GST", "IGST", "CGST", "SGST", "ASSESSMENT", "TAX", "SERVICE CHARGE", "PROCESSING FEE", "CASHBACK", "REWARD"
   - **Rule: If the transaction is a bank charge, fee, tax on fee, or reward credit - EXCLUDE IT**
   - **These are NOT customer spending - completely exclude them from the transactions array**

2. **Transaction Types - BE VERY CAREFUL:**
   - "Dr" or "Debit" = SPENDING (purchases, bills) - ALWAYS use positive amounts
   - "Cr" or "Credit" = PAYMENTS/REFUNDS (money received) - ALWAYS use positive amounts
   - DO NOT mix up debits and credits - this is critical for accurate spending analysis

3. **Amount Handling - CRITICAL:**
   - ALL amounts must be in RUPEES (₹), NOT paise
   - ALL amounts must be POSITIVE numbers (no negative signs)
   - The "type" field (Dr/Cr) indicates the transaction direction
   - Remove currency symbols, commas, and spaces from amounts
   - **UNIVERSAL PAISE DETECTION RULE**: 
     - If raw amount > 50,000 → ALWAYS divide by 100 (likely paise)
     - If raw amount > 10,000 and contains no decimal → ALWAYS divide by 100 (likely paise)
     - If raw amount > 1,000,000 → ALWAYS divide by 100 (definitely paise)
   - **Examples of paise conversion:**
     - "281194" → ₹2,811.94 (divide by 100)
     - "220839924" → ₹22,083.99 (divide by 100)
     - "5000000" → ₹50,000.00 (divide by 100)
     - "45000" → ₹450.00 (divide by 100)
   - **RULE**: When in doubt, if amount > 50,000, divide by 100

4. **Description Cleaning:**
   - Extract the merchant name cleanly (remove transaction IDs, reference numbers)
   - Remove prefixes: "POS*", "ECOM*", "INTL*", "AUTH*", "TXN*", "REF*"
   - Keep location if present (e.g., "SWIGGY BANGALORE")
   - Remove: "TXN", "REF", long alphanumeric codes
   - Good: "AMAZON INDIA", "SWIGGY BANGALORE", "FLIPKART"
   - Bad: "AMAZON1234567890TXN", "REF12345SWIGGY", "POS*AMAZON"

5. **Categorization Rules:**
   - amazon_spends: Amazon.in purchases (NOT Amazon Pay bill payments)
   - flipkart_spends: Flipkart purchases
   - grocery_spends_online: Blinkit, BigBasket, Instamart, Zepto, Dunzo
   - online_food_ordering: Swiggy, Zomato, UberEats
   - dining_or_going_out: Restaurant names, cafes, food courts
   - flights: Airlines (IndiGo, SpiceJet, Air India, etc.)
   - hotels: Hotel bookings (OYO, MakeMyTrip, Booking.com)
   - fuel: HPCL, IOCL, BPCL, Shell petrol pumps
   - mobile_phone_bills: Airtel, Jio, Vi, BSNL recharges/bills, PhonePe utility payments
   - electricity_bills: Electricity board payments, VPS (Vidyut Prashasan Seva via HDFC PayZapp)
   - water_bills: Water board payments
   - ott_channels: Netflix, Amazon Prime, Disney+, Spotify, YouTube Premium
   - pharmacy: Apollo Pharmacy, NetMeds, 1mg, PharmEasy
   - large_electronics: Electronics >₹50,000 (laptops, phones, TVs, fridges)
   - insurance_health: Health insurance premiums
   - insurance_car_or_bike: Vehicle insurance
   - school_fees: Educational institutions
   - rent: House/apartment rent payments, DREAMPLUG TECHNOLOGIES (Cred rent payments), CRED app (rent, maintenance, education, school fees)
   - upi_transactions: All UPI payments (UPI TINKU K PAYTM, UPI VIKAS, UPI PHONEPE, UPI CITY CH, UPI NATURAL)
   - other_online_spends: Other e-commerce or online payments (exclude UPI and rent)
   - other_offline_spends: Physical store purchases (default if unclear)

6. **Card Details Extraction - CRITICAL:**
   - Extract the last 4 digits of the credit card number from the statement
   - Look for patterns like "XXXX XXXX XXXX 1234", "****1234", "Card ending in 1234"
   - Search the entire statement for card number references
   - Common locations: header, footer, account summary section
   - If no card number is visible, use "Unknown" for the num field
   - Always include both "num" (last 4 digits) and "masked_number" (full masked format)
   - Examples: "XXXX XXXX XXXX 1234" → num: "1234", masked_number: "XXXX XXXX XXXX 1234"
   - **Extract the card type/name from the statement header, title, or branding**
   - Look for card names like "MAGNUS", "Millenia", "Live+", "Cashback", "FIRST Wealth", "Shoprite", etc.
   - The card_type field should contain the exact card name as shown on the statement
   - Examples: "AXIS MAGNUS" → card_type: "MAGNUS", "FIRST Wealth" → card_type: "Wealth", "HDFC Millenia" → card_type: "Millenia"

7. **Date Format:**
   - Always use YYYY-MM-DD format
   - If only DD/MM/YY is available, infer the year from statement period

**OUTPUT FORMAT:**
{
  "bank": "${bankCode}",
  "card_details": {
    "num": "1234",
    "masked_number": "XXXX XXXX XXXX 1234",
    "card_type": "MAGNUS"
  },
  "transactions": [
    {
      "date": "2025-09-15",
      "description": "SWIGGY BANGALORE",
      "amount": 350.00,
      "type": "Dr",
      "category": "online_food_ordering"
    },
    {
      "date": "2025-09-20",
      "description": "PAYMENT RECEIVED",
      "amount": 5000.00,
      "type": "Cr",
      "category": "other_offline_spends"
    }
  ]
}

**VALIDATION:**
- Extract EVERY customer spending transaction (purchases, bills, utilities)
- EXCLUDE ALL bank fees, charges, interest, and taxes on fees
- All amounts must be positive numbers
- All dates must be in YYYY-MM-DD format
- All types must be either "Dr" or "Cr"
- All categories must match the list above exactly
- Clean merchant names (remove transaction codes and prefixes)

Be thorough and accurate. Double-check Dr vs Cr classification. Remember: Finance charges and bank fees are NOT spending!`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Indian credit card statement parser. Your primary job is to accurately distinguish between DEBIT (Dr) transactions (spending) and CREDIT (Cr) transactions (payments/refunds). Extract all transaction data precisely, clean merchant names, and categorize spending accurately. Always use positive amounts - the type field indicates direction.',
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
          schema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            additionalProperties: false,
            required: ['bank', 'transactions'],
            properties: {
              bank: { type: 'string' },
              card_details: {
                type: 'object',
                properties: {
                  num: { type: 'string' },
                  masked_number: { type: 'string' },
                  card_type: { type: 'string' }
                }
              },
              transactions: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['date', 'description', 'amount', 'type', 'category'],
                  properties: {
                    date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
                    description: { type: 'string' },
                    amount: { type: 'number', minimum: 0 },
                    type: { type: 'string', enum: ['Dr', 'Cr'] },
                    category: { 
                      type: 'string',
                      enum: ['amazon_spends', 'flipkart_spends', 'grocery_spends_online', 'online_food_ordering', 'dining_or_going_out', 'other_online_spends', 'other_offline_spends', 'flights', 'hotels', 'mobile_phone_bills', 'electricity_bills', 'water_bills', 'ott_channels', 'fuel', 'school_fees', 'rent', 'insurance_health', 'insurance_car_or_bike', 'large_electronics', 'pharmacy']
                    }
                  }
                }
              }
            }
          },
          strict: true
        }
      },
      temperature: 0,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);
    
    // Post-processing: Filter out any bank fees/charges that LLM might have missed
    const originalCount = parsed.transactions?.length || 0;
    const excludePatterns = [
      /fin.*chg/i, /finance.*charge/i, /interest/i, /late.*fee/i,
      /annual.*fee/i, /membership.*fee/i, /gst/i, /igst/i, /cgst/i, /sgst/i,
      /assessment/i, /tax.*on/i, /service.*charge/i, /processing.*fee/i,
      /cashback/i, /reward/i, /reversal/i, /refund.*fee/i, /over.*limit/i
    ];
    
    if (parsed.transactions && Array.isArray(parsed.transactions)) {
      // Log all transactions before filtering
      console.log(`\n📋 LLM PARSING RESULTS (${originalCount} transactions):`);
      console.log('='.repeat(80));
      parsed.transactions.forEach((t: any, index: number) => {
        console.log(`${index + 1}. [${t.type}] ${t.date} | ${t.description}`);
        console.log(`   Amount: ₹${t.amount} | Category: ${t.category}`);
      });
      console.log('='.repeat(80));
      
      // Filter out fees/charges
      parsed.transactions = parsed.transactions.filter((t: any) => {
        const desc = (t.description || '').toLowerCase();
        const shouldExclude = excludePatterns.some(pattern => pattern.test(desc));
        if (shouldExclude) {
          console.log(`   ⚠️  Filtered out fee/charge: "${t.description}" (₹${t.amount})`);
        }
        return !shouldExclude;
      });
      
      const filteredCount = originalCount - parsed.transactions.length;
      if (filteredCount > 0) {
        console.log(`   📝 Post-processing filtered ${filteredCount} fee/charge transactions`);
      }
      
      // Log final kept transactions
      if (parsed.transactions.length > 0) {
        console.log(`\n✅ FINAL TRANSACTIONS KEPT (${parsed.transactions.length}):`);
        parsed.transactions.forEach((t: any, index: number) => {
          console.log(`${index + 1}. [${t.type}] ₹${t.amount} - ${t.description} → ${t.category}`);
        });
      }
    }
    
    return {
      success: true,
      transactionCount: parsed.transactions?.length || 0,
      data: parsed
    };
  } catch (error: any) {
    console.error('OpenAI parsing error:', error);
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, statements, userDetails, sessionId } = body;

    if (!accessToken || !statements || !Array.isArray(statements)) {
      return NextResponse.json(
        { error: 'Access token and statements array required' },
        { status: 400 }
      );
    }

    console.log(`🔄 V2 Processing ${statements.length} statements using proven script method`);
    console.log(`👤 User details:`, { 
      name: userDetails?.name, 
      dob: userDetails?.dob,
      cardsCount: userDetails?.cards?.length || 0,
      cards: userDetails?.cards
    });

    // Validate required fields for selected banks
    const bankRules: Record<string, {requiredFields: string[], maxAttempts: number}> = {
      'hsbc': { requiredFields: ['dob', 'card_last6'], maxAttempts: 10 },
      'hdfc': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'axis': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'rbl': { requiredFields: ['dob'], maxAttempts: 6 },
      'idfc': { requiredFields: ['dob'], maxAttempts: 4 },
      'sbi': { requiredFields: ['dob', 'card_last4'], maxAttempts: 8 },
      'yes': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'icici': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'indusind': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
      'aubank': { requiredFields: ['name', 'dob'], maxAttempts: 8 },
    };

    // Check if user has provided required fields for all selected banks
    const missingFieldsByBank: Record<string, string[]> = {};
    const selectedBanks = [...new Set(statements.map(s => s.bank_code))];
    
    for (const bankCode of selectedBanks) {
      const rules = bankRules[bankCode.toLowerCase()];
      if (!rules) continue;
      
      const missingFields: string[] = [];
      
      // Find the specific card for this bank from the original registry (frontend format)
      const bankCard = userDetails?.cards?.find((c: any) => c.bankCode === bankCode);
      
      for (const field of rules.requiredFields) {
        if (field === 'name' && !userDetails?.name) missingFields.push('name');
        if (field === 'dob' && !userDetails?.dob) missingFields.push('dob');
        if (field === 'card_last4' && !bankCard?.last4) missingFields.push('card_last4');
        if (field === 'card_last6' && !bankCard?.last6) missingFields.push('card_last6');
      }
      
      if (missingFields.length > 0) {
        missingFieldsByBank[bankCode] = missingFields;
      }
    }

    // If any required fields are missing, return error with details
    if (Object.keys(missingFieldsByBank).length > 0) {
      const errorMessage = Object.entries(missingFieldsByBank)
        .map(([bank, fields]) => `${bank.toUpperCase()}: ${fields.join(', ')}`)
        .join('; ');
      
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        missingFields: missingFieldsByBank,
        message: `Please provide the following required fields: ${errorMessage}`,
        requiresUserInput: true
      }, { status: 400 });
    }

    // Create Gmail client for downloading PDFs
    const gmailClient = new GmailClient(accessToken);
    const startTime = Date.now();

    const results = [];
    let successCount = 0;
    let errorCount = 0;
    const completedBanks: Array<{
      bankCode: string;
      statementCount: number;
      duration: number;
      status: 'success' | 'failed' | 'partial';
      transactionsFound?: number;
    }> = [];
    const bankStartTimes = new Map<string, number>();

    // Helper function to update progress
    const updateProgress = async (progress: any) => {
      if (sessionId) {
        try {
          await fetch(`${request.nextUrl.origin}/api/gmail/process-statements-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, progress })
          });
        } catch (error) {
          console.error('Failed to update progress:', error);
        }
      }
    };

    // Initialize progress
    await updateProgress({
      totalStatements: statements.length,
      completedStatements: 0,
      currentPhase: 'pdf_processing',
      phaseProgress: 0,
      elapsedTime: 0,
      completedBanks: [],
      estimatedTimeRemaining: statements.length * 15
    });

    // Process each statement using the proven script method
    for (let statementIndex = 0; statementIndex < statements.length; statementIndex++) {
      const statement = statements[statementIndex];
      
      // Track bank start time
      if (!bankStartTimes.has(statement.bank_code)) {
        bankStartTimes.set(statement.bank_code, Date.now());
      }
      
      // Update progress - current statement
      await updateProgress({
        totalStatements: statements.length,
        completedStatements: statementIndex,
        currentStatement: {
          bankCode: statement.bank_code,
          filename: statement.attachment.filename,
          phase: 'download'
        },
        currentPhase: 'pdf_processing',
        phaseProgress: Math.round((statementIndex / statements.length) * 100),
        elapsedTime: Math.floor((Date.now() - startTime) / 1000),
        estimatedTimeRemaining: (statements.length - statementIndex) * 15,
        completedBanks: [...completedBanks]
      });
      try {
        console.log(`📄 V2 Processing ${statement.bank_code}: ${statement.attachment.filename}`);
        
        // Extract card numbers from subject/filename
        const subjectNumbers = statement.subject.match(/\d{4}/g) || [];
        const filenameNumbers = statement.attachment.filename.match(/\d{4}/g) || [];
        const detectedCardNumbers = [...new Set([...subjectNumbers, ...filenameNumbers])];
        console.log(`🔍 Detected card numbers from email: ${detectedCardNumbers.join(', ') || 'none'}`);

        // Check if we have attachment_id
        if (!statement.attachment.attachment_id) {
          throw new Error(`Missing attachment_id for ${statement.attachment.filename}`);
        }

        // Convert new card registry format to expected format
        const userCardRegistry = (userDetails?.cards || []).map((card: any) => ({
          bank_code: card.bankCode,
          last4: card.last4,
          last6: card.last6,
          status: 'active'
        }));

        console.log(`👤 User has ${userCardRegistry.length} cards in registry:`, userCardRegistry);

        // Debug: Log the user details structure
        console.log(`🔍 User details structure:`, {
          hasCards: !!userDetails?.cards,
          cardsType: typeof userDetails?.cards,
          cardsLength: userDetails?.cards?.length,
          firstCard: userDetails?.cards?.[0]
        });

        // Match statement to specific card
        const cardMatch = matchStatementToCard(
          statement.bank_code,
          detectedCardNumbers,
          userCardRegistry
        );

        console.log(`🎯 Card matching result: ${cardMatch.matched ? 'MATCHED' : 'NOT MATCHED'}`);
        console.log(`   Confidence: ${cardMatch.confidence}`);
        console.log(`   Reason: ${cardMatch.reason}`);
        if (cardMatch.card) {
          console.log(`   Using card: ${cardMatch.card.last4}`);
        }

        // Build enhanced user details with matched card
        const enhancedUserDetails = buildEnhancedUserDetails(
          userDetails?.name || '',
          userDetails?.dob || '',
          userDetails?.mobile,
          cardMatch.card,
          userCardRegistry
        );

        console.log(`📋 Enhanced user details:`, {
          name: enhancedUserDetails.name,
          dob: enhancedUserDetails.dob,
          matchedCard: enhancedUserDetails.card?.last4 || 'none',
          allCardsCount: enhancedUserDetails.allCards?.length || 0,
        });

        // Download PDF from Gmail
        console.log(`📥 Downloading PDF from Gmail...`);
        const pdfBuffer = await gmailClient.getAttachment(
          statement.message_id,
          statement.attachment.attachment_id
        );

        if (!pdfBuffer) {
          throw new Error('Failed to download PDF from Gmail');
        }

        console.log(`📊 Downloaded PDF: ${pdfBuffer.length} bytes`);

        // Generate password attempts using bank-specific rules
        const bankCode = statement.bank_code.toLowerCase() as keyof typeof BANK_PASSWORD_RULES;
        const passwordRule = BANK_PASSWORD_RULES[bankCode];
        
        if (!passwordRule) {
          throw new Error(`No password rules defined for bank: ${bankCode}`);
        }

        // Prepare user details for password generation (using new card registry format)
        const passwordUserDetails = {
          name: enhancedUserDetails.name,
          dob: enhancedUserDetails.dob,
          cards: userCardRegistry // Pass the original card registry with full data including last6
        };

        const attempts = passwordRule.generatePasswords(passwordUserDetails, bankCode);
        
        if (attempts.length === 0) {
          throw new Error('No password attempts generated - missing required fields');
        }

        console.log(`🔐 Generated ${attempts.length} password attempts for ${bankCode.toUpperCase()}`);

        // Try each password using the proven script method
        let success = false;
        let usedPassword = '';
        let parsedData = null;
        let transactionCount = 0;

        for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
          const attempt = attempts[attemptIndex];
          if (!attempt) continue;
          
          console.log(`🔑 Attempt ${attemptIndex + 1}/${attempts.length}: "${attempt.password}" (${attempt.source})`);
          
          // Update progress - decrypt phase
          await updateProgress({
            totalStatements: statements.length,
            completedStatements: statementIndex,
            currentStatement: {
              bankCode: statement.bank_code,
              filename: statement.attachment.filename,
              phase: 'decrypt',
              attempts: attemptIndex + 1,
              maxAttempts: attempts.length,
              currentPassword: attempt.password
            },
            currentPhase: 'pdf_processing',
            phaseProgress: Math.round((statementIndex / statements.length) * 100),
            elapsedTime: Math.floor((Date.now() - startTime) / 1000),
            estimatedTimeRemaining: (statements.length - statementIndex) * 15
          });
          
          try {
            // Try qpdf decryption (same as test-single-pdf.js)
            const decryptResult = tryQpdfDecryption(pdfBuffer, attempt.password);
            
            if (decryptResult.success) {
              console.log(`✅ Decryption successful with password: "${attempt.password}"`);
              
              // Update progress - parse phase
              await updateProgress({
                totalStatements: statements.length,
                completedStatements: statementIndex,
                currentStatement: {
                  bankCode: statement.bank_code,
                  filename: statement.attachment.filename,
                  phase: 'parse'
                },
                currentPhase: 'pdf_processing',
                phaseProgress: Math.round((statementIndex / statements.length) * 100),
                elapsedTime: Math.floor((Date.now() - startTime) / 1000),
                estimatedTimeRemaining: (statements.length - statementIndex) * 15
              });

              // Extract text from decrypted PDF (same as test-single-pdf.js)
              const textResult = extractTextFromDecryptedPDF(decryptResult.decryptedPath!);
              
              if (textResult.success) {
                console.log(`📄 Text extracted: ${textResult.text!.length} characters`);
                
                // Check if this is a decrypted PDF that needs secondary processing
                if (textResult.text!.includes('[PDF_DECRYPTED_SUCCESSFULLY]')) {
                  console.log(`🔄 PDF was decrypted, using DecryptedPDFProcessor for secondary processing`);
                  
                  const { DecryptedPDFProcessor } = await import('@/lib/pdf-processor/decrypted-processor');
                  const processor = new DecryptedPDFProcessor();
                  
                  const decryptedPath = decryptResult.decryptedPath;
                  if (decryptedPath) {
                    const parseResult = await processor.processDecryptedPDF(decryptedPath, bankCode);
                    
                    if (parseResult.success) {
                      console.log(`🤖 Parsed successfully: ${parseResult.data?.content?.transactions?.length || 0} transactions`);
                      
                      success = true;
                      usedPassword = attempt.password;
                      parsedData = parseResult.data;
                      transactionCount = parseResult.data?.content?.transactions?.length || 0;
                    } else {
                      console.log(`❌ DecryptedPDFProcessor failed: ${parseResult.error}`);
                    }
                  } else {
                    console.log(`❌ No decrypted path found in metadata`);
                  }
                } else {
                  // Parse with OpenAI (same as bulk-process-dynamic.js)
                  const parseResult = await parseWithOpenAI(textResult.text!, bankCode);
                
                  if (parseResult.success) {
                    console.log(`🤖 Parsed successfully: ${parseResult.transactionCount} transactions`);
                    
                    success = true;
                    usedPassword = attempt.password;
                    parsedData = parseResult.data;
                    transactionCount = parseResult.transactionCount || 0;
                  } else {
                    console.log(`❌ OpenAI parsing failed: ${parseResult.error}`);
                  }
                }
                
                // Update progress - save phase
                await updateProgress({
                  totalStatements: statements.length,
                  completedStatements: statementIndex + 1,
                  currentStatement: {
                    bankCode: statement.bank_code,
                    filename: statement.attachment.filename,
                    phase: 'save'
                  },
                  currentPhase: 'pdf_processing',
                  phaseProgress: Math.round(((statementIndex + 1) / statements.length) * 100),
                  elapsedTime: Math.floor((Date.now() - startTime) / 1000),
                  estimatedTimeRemaining: (statements.length - statementIndex - 1) * 15
                });
                
                // Cleanup decrypted file
                if (existsSync(decryptResult.decryptedPath!)) {
                  unlinkSync(decryptResult.decryptedPath!);
                }
                
                break; // Stop after first success
              } else {
                console.log(`❌ Text extraction failed: ${textResult.error}`);
              }
              
              // Cleanup on failure
              if (existsSync(decryptResult.decryptedPath!)) {
                unlinkSync(decryptResult.decryptedPath!);
              }
            } else {
              console.log(`❌ Decryption failed: ${decryptResult.error}`);
            }
          } catch (error: any) {
            console.log(`❌ Error: ${error.message}`);
          }
        }

        const processedStatement = {
          ...statement,
          processing_result: {
            success,
            passwordUsed: usedPassword,
            transactionCount,
            parsedData,
            attempts: attempts.length,
            error: success ? null : 'All password attempts failed'
          },
          parsed: success,
        };

        results.push(processedStatement);

        if (success) {
          successCount++;
          console.log(`✅ V2 Successfully processed ${statement.bank_code} with password: ${usedPassword}`);
        } else {
          errorCount++;
          console.log(`❌ V2 Failed to process ${statement.bank_code}: All password attempts failed`);
        }

        // Check if this was the last statement for this bank
        const remainingStatementsForBank = statements.slice(statementIndex + 1).filter(s => s.bank_code === statement.bank_code);
        if (remainingStatementsForBank.length === 0) {
          // This was the last statement for this bank - mark bank as completed
          const bankStartTime = bankStartTimes.get(statement.bank_code) || startTime;
          const bankDuration = Math.floor((Date.now() - bankStartTime) / 1000);
          const bankStatements = statements.filter(s => s.bank_code === statement.bank_code);
          const bankSuccessCount = results.filter(r => r.bank_code === statement.bank_code && r.parsed).length;
          
          completedBanks.push({
            bankCode: statement.bank_code,
            statementCount: bankStatements.length,
            duration: bankDuration,
            status: bankSuccessCount === bankStatements.length ? 'success' : 
                   bankSuccessCount === 0 ? 'failed' : 'partial',
            transactionsFound: results.filter(r => r.bank_code === statement.bank_code && r.parsed)
              .reduce((sum, r) => sum + (r.processing_result?.transactionCount || 0), 0)
          });
          
          console.log(`🏦 Bank ${statement.bank_code} completed: ${bankSuccessCount}/${bankStatements.length} statements successful`);
        }

      } catch (error: any) {
        console.error(`💥 V2 Error processing ${statement.bank_code}:`, error);
        
        results.push({
          ...statement,
          processing_result: {
            success: false,
            error: error.message || 'Processing failed',
            attempts: 0,
          },
          parsed: false,
        });
        
        errorCount++;
      }
    }

    console.log(`📊 V2 Processing complete: ${successCount} success, ${errorCount} errors`);

    // Clean up progress tracking
    if (sessionId) {
      try {
        await fetch(`${request.nextUrl.origin}/api/gmail/process-statements-progress?sessionId=${sessionId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Failed to cleanup progress:', error);
      }
    }

    return NextResponse.json({
      success: true,
      version: 'v2',
      method: 'qpdf-direct-standalone-extraction',
      processed_count: statements.length,
      success_count: successCount,
      error_count: errorCount,
      statements: results,
      summary: {
        total_processed: statements.length,
        successful: successCount,
        failed: errorCount,
        success_rate: statements.length > 0 ? (successCount / statements.length * 100).toFixed(1) + '%' : '0%',
      },
    });

  } catch (error: any) {
    console.error('V2 Statement processing error:', error);
    
    return NextResponse.json(
      {
        error: 'V2 Processing failed',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
