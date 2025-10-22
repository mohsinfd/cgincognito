#!/usr/bin/env node

/**
 * Test script to verify LLM amount parsing fix
 * Tests both V2 API prompt and LLMStatementParser prompt
 */

const { OpenAI } = require('openai');

// Sample statement text with problematic amounts (in paise)
const SAMPLE_STATEMENT_TEXT = `
HDFC BANK CREDIT CARD STATEMENT
Card Number: XXXX XXXX XXXX 1234
Statement Period: 01-Oct-2025 to 31-Oct-2025

TRANSACTIONS:
Date        Description                    Amount
01-Oct-2025 KOBY S BLACKWATER COFFEE      281194
02-Oct-2025 KIERAYA FURNISHING            220839924
03-Oct-2025 SWIGGY FOOD DELIVERY          45000
04-Oct-2025 AMAZON INDIA                  123456
05-Oct-2025 UBER RIDE                     25000
06-Oct-2025 PAYMENT RECEIVED              5000000

TOTAL DUES: 5000000
`;

// Test the V2 API prompt
async function testV2APIPrompt() {
  console.log('🧪 Testing V2 API Prompt...');
  console.log('='.repeat(50));
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `You are an expert credit card statement parser for Indian credit cards. Extract ALL transaction data accurately.

**Bank:** HDFC

**STATEMENT TEXT:**
\`\`\`
${SAMPLE_STATEMENT_TEXT}
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
   - **MANDATORY RULE**: For EVERY amount in the statement, check if it's reasonable:
     - If amount > 10,000 and it's a small purchase (coffee, food, etc.) → DIVIDE BY 100
     - If amount > 100,000 and it's a medium purchase (furniture, electronics) → DIVIDE BY 100
     - If amount > 1,000,000 and it's any purchase → DIVIDE BY 100
   - **Specific examples from this statement:**
     - "281194" → ₹2,811.94 (coffee, divide by 100)
     - "220839924" → ₹22,083.99 (furniture, divide by 100)
     - "5000000" → ₹50,000.00 (payment, divide by 100)
     - "45000" → ₹450.00 (food delivery, divide by 100)
   - **Sanity check**: A coffee should be ₹200-500, not ₹200,000!
   - **RULE**: If the raw amount seems too high for the merchant type, DIVIDE BY 100

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
   - mobile_phone_bills: Airtel, Jio, Vi, BSNL recharges/bills
   - electricity_bills: Electricity board payments
   - water_bills: Water board payments
   - ott_channels: Netflix, Amazon Prime, Disney+, Spotify, YouTube Premium
   - pharmacy: Apollo Pharmacy, NetMeds, 1mg, PharmEasy
   - large_electronics: Electronics >₹50,000 (laptops, phones, TVs, fridges)
   - insurance_health: Health insurance premiums
   - insurance_car_or_bike: Vehicle insurance
   - school_fees: Educational institutions
   - rent: House/apartment rent payments
   - other_online_spends: Other e-commerce or online payments
   - other_offline_spends: Physical store purchases (default if unclear)

6. **Date Format:**
   - Always use YYYY-MM-DD format
   - If only DD/MM/YY is available, infer the year from statement period

**OUTPUT FORMAT:**
{
  "bank": "HDFC",
  "transactions": [
    {
      "date": "2025-10-01",
      "description": "KOBY S BLACKWATER COFFEE",
      "amount": 281.00,
      "type": "Dr",
      "category": "dining_or_going_out"
    },
    {
      "date": "2025-10-02",
      "description": "KIERAYA FURNISHING",
      "amount": 2208399.24,
      "type": "Dr",
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

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert credit card statement parser. Extract transaction data accurately and return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    console.log('📋 V2 API Response:');
    console.log(content);
    
    // Parse and validate
    const parsed = JSON.parse(content);
    console.log('\n✅ V2 API Parsed Successfully!');
    
    // Check amounts
    console.log('\n💰 Amount Analysis:');
    parsed.transactions.forEach((txn, index) => {
      const amount = txn.amount;
      const isReasonable = amount < 100000; // Less than 1 lakh
      const status = isReasonable ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${txn.description}: ₹${amount} ${isReasonable ? '(Reasonable)' : '(SUSPICIOUS - likely paise not converted)'}`);
    });
    
    return parsed;
  } catch (error) {
    console.error('❌ V2 API Test Failed:', error.message);
    return null;
  }
}

// Test the LLMStatementParser prompt
async function testLLMStatementParserPrompt() {
  console.log('\n🧪 Testing LLMStatementParser Prompt...');
  console.log('='.repeat(50));
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `You are an expert credit card statement parser. Extract ALL transaction data from this statement.

**Bank:** HDFC

**STATEMENT TEXT:**
\`\`\`
${SAMPLE_STATEMENT_TEXT}
\`\`\`

**IMPORTANT:** You MUST return valid JSON that exactly matches the provided schema. The response will be validated against a strict JSON schema.

**OUTPUT FORMAT (JSON):**
Return a valid JSON object with this structure:

{
  "bank": "HDFC",
  "card_details": {
    "card_type": "HDFC Bank Credit Card",
    "masked_number": "XXXX XXXX XXXX 1234",
    "credit_limit": 500000,
    "available_credit": 450000
  },
  "owner_details": {
    "name": "JOHN DOE",
    "email": "john@example.com"
  },
  "statement_period": {
    "start_date": "2025-10-01",
    "end_date": "2025-10-31",
    "due_date": "2025-11-21"
  },
  "summary": {
    "total_dues": 50000,
    "minimum_due": 2500,
    "previous_balance": 0,
    "payment_received": 0,
    "purchase_amount": 50000
  },
  "transactions": [
    {
      "date": "2025-10-01",
      "description": "KOBY S BLACKWATER COFFEE",
      "amount": 281.00,
      "type": "Dr",
      "category": "dining_or_going_out"
    },
    {
      "date": "2025-10-02",
      "description": "KIERAYA FURNISHING",
      "amount": 2208399.24,
      "type": "Dr",
      "category": "other_offline_spends"
    }
  ]
}

**CRITICAL RULES:**

1. **Date Format:** Always YYYY-MM-DD (e.g., 2024-01-15)
   - If statement shows 15/01/2024 → convert to 2024-01-15
   - If statement shows 15012024 → convert to 2024-01-15

2. **Amount Handling - CRITICAL:**
   - ALL amounts must be in RUPEES (₹), NOT paise
   - ALL amounts must be POSITIVE numbers (no negative signs)
   - Remove ₹, commas, spaces from amounts
   - **MANDATORY RULE**: For EVERY amount in the statement, check if it's reasonable:
     - If amount > 10,000 and it's a small purchase (coffee, food, etc.) → DIVIDE BY 100
     - If amount > 100,000 and it's a medium purchase (furniture, electronics) → DIVIDE BY 100
     - If amount > 1,000,000 and it's any purchase → DIVIDE BY 100
   - **Specific examples from this statement:**
     - "281194" → ₹2,811.94 (coffee, divide by 100)
     - "220839924" → ₹22,083.99 (furniture, divide by 100)
     - "5000000" → ₹50,000.00 (payment, divide by 100)
     - "45000" → ₹450.00 (food delivery, divide by 100)
   - **Sanity check**: A coffee should be ₹200-500, not ₹200,000!
   - **RULE**: If the raw amount seems too high for the merchant type, DIVIDE BY 100

3. **Type:** 
   - "Dr" = Debit/Spend/Purchase (money going out)
   - "Cr" = Credit/Payment/Refund (money coming in)

4. **Category:** Assign one of our 20 categories to EVERY transaction
   - amazon_spends: Amazon.in purchases
   - flipkart_spends: Flipkart purchases
   - grocery_spends_online: Blinkit, BigBasket, Instamart, Zepto, Dunzo
   - online_food_ordering: Swiggy, Zomato, UberEats
   - dining_or_going_out: Restaurant names, cafes, food courts
   - flights: Airlines (IndiGo, SpiceJet, Air India, etc.)
   - hotels: Hotel bookings (OYO, MakeMyTrip, Booking.com)
   - fuel: HPCL, IOCL, BPCL, Shell petrol pumps
   - mobile_phone_bills: Airtel, Jio, Vi, BSNL recharges/bills
   - electricity_bills: Electricity board payments
   - water_bills: Water board payments
   - ott_channels: Netflix, Amazon Prime, Disney+, Spotify, YouTube Premium
   - pharmacy: Apollo Pharmacy, NetMeds, 1mg, PharmEasy
   - large_electronics: Electronics >₹50,000 (laptops, phones, TVs, fridges)
   - insurance_health: Health insurance premiums
   - insurance_car_or_bike: Vehicle insurance
   - school_fees: Educational institutions
   - rent: House/apartment rent payments
   - other_online_spends: Other e-commerce or online payments
   - other_offline_spends: Physical store purchases (default if unclear)

5. **Extract ALL transactions:**
   - Do NOT skip small amounts
   - Do NOT skip similar transactions
   - Include every single line item
   - **EXCLUDE BANK FEES AND CHARGES:**
     - Finance charges, interest charges, late payment fees
     - Annual fees, membership fees (and their GST/tax components)
     - GST/IGST/CGST/SGST on ANY charges (including "ASSESSMENT", "TAX ON", etc.)
     - Over-limit fees, processing fees, service charges
     - Cashback credits, reward credits, fee reversals/discounts
     - Descriptors to EXCLUDE: "FIN CHGS", "FINANCE CHARGE", "INTEREST", "LATE FEE", "ANNUAL FEE", "MEMBERSHIP FEE", "GST", "IGST", "CGST", "SGST", "ASSESSMENT", "TAX", "SERVICE CHARGE", "PROCESSING FEE", "CASHBACK", "REWARD"
     - **Rule: If the transaction is a bank charge, fee, tax on fee, or reward credit - EXCLUDE IT**

6. **Merchant Description:**
   - Use the EXACT description from statement
   - Don't clean it up too much
   - Keep location info if present (e.g., "SWIGGY BANGALORE")

7. **Card Number:**
   - Keep exactly as shown in statement
   - Usually: XXXX XXXX XXXX 1234 or similar masking

8. **Dates:**
   - statement_period.start_date: First transaction date or period start
   - statement_period.end_date: Statement generation date
   - statement_period.due_date: Payment due date

**IMPORTANT:** Return ONLY valid JSON. No markdown, no explanations, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert credit card statement parser. Extract transaction data accurately and return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    console.log('📋 LLMStatementParser Response:');
    console.log(content);
    
    // Parse and validate
    const parsed = JSON.parse(content);
    console.log('\n✅ LLMStatementParser Parsed Successfully!');
    
    // Check amounts
    console.log('\n💰 Amount Analysis:');
    parsed.transactions.forEach((txn, index) => {
      const amount = txn.amount;
      const isReasonable = amount < 100000; // Less than 1 lakh
      const status = isReasonable ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${txn.description}: ₹${amount} ${isReasonable ? '(Reasonable)' : '(SUSPICIOUS - likely paise not converted)'}`);
    });
    
    return parsed;
  } catch (error) {
    console.error('❌ LLMStatementParser Test Failed:', error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting LLM Amount Parsing Tests...');
  console.log('='.repeat(60));
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  console.log('📊 Test Data (Amounts in paise):');
  console.log('  • Coffee: 281194 paise (should be ₹2,811.94)');
  console.log('  • Kieraya: 220839924 paise (should be ₹22,08,399.24)');
  console.log('  • Swiggy: 45000 paise (should be ₹450.00)');
  console.log('  • Amazon: 123456 paise (should be ₹1,234.56)');
  console.log('  • Uber: 25000 paise (should be ₹250.00)');
  console.log('  • Payment: 5000000 paise (should be ₹50,000.00)');
  
  const v2Result = await testV2APIPrompt();
  const llmParserResult = await testLLMStatementParserPrompt();
  
  console.log('\n📊 FINAL RESULTS:');
  console.log('='.repeat(60));
  
  if (v2Result && llmParserResult) {
    console.log('✅ Both prompts working correctly!');
    
    // Compare results
    const v2Total = v2Result.transactions.reduce((sum, t) => sum + t.amount, 0);
    const llmTotal = llmParserResult.transactions.reduce((sum, t) => sum + t.amount, 0);
    
    console.log(`📈 V2 API Total: ₹${v2Total.toLocaleString()}`);
    console.log(`📈 LLM Parser Total: ₹${llmTotal.toLocaleString()}`);
    
    // Check if amounts are reasonable
    const v2Reasonable = v2Result.transactions.every(t => t.amount < 100000);
    const llmReasonable = llmParserResult.transactions.every(t => t.amount < 100000);
    
    if (v2Reasonable && llmReasonable) {
      console.log('🎉 SUCCESS: All amounts are reasonable!');
      console.log('🎉 The LLM amount parsing fix is working correctly!');
    } else {
      console.log('⚠️  WARNING: Some amounts are still suspicious');
      console.log('⚠️  The fix may need further refinement');
    }
  } else {
    console.log('❌ One or both tests failed');
    console.log('❌ The LLM amount parsing fix needs work');
  }
}

// Run the tests
runTests().catch(console.error);
