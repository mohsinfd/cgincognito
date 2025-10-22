/**
 * LLM Prompts for statement parsing
 */

import { CATEGORY_DESCRIPTIONS } from './transaction-schema';

/**
 * Bank detection prompt (quick & cheap)
 */
export function getBankDetectionPrompt(previewText: string): string {
  return `Identify the bank from this credit card statement header:

${previewText}

Respond with ONLY the bank code from this list:
HDFC, AXIS, SBI, ICICI, KOTAK, AMEX, CITI, SC, HSBC, INDUSIND, YES, RBL, OTHER

Bank code:`;
}

/**
 * Full statement extraction prompt
 */
export function getStatementExtractionPrompt(
  statementText: string,
  bank?: string,
  fewShotExamples?: string
): string {
  const bankHint = bank ? `\n**Bank:** ${bank}` : '';
  const examples = fewShotExamples || '';

  return `You are an expert credit card statement parser. Extract ALL transaction data from this statement.

${bankHint}

**STATEMENT TEXT:**
\`\`\`
${statementText}
\`\`\`

**IMPORTANT:** You MUST return valid JSON that exactly matches the provided schema. The response will be validated against a strict JSON schema.

**OUTPUT FORMAT (JSON):**
Return a valid JSON object with this structure:

{
  "bank": "HDFC|AXIS|SBI|ICICI|...",
  "card_details": {
    "card_type": "Card variant name",
    "masked_number": "XXXX XXXX XXXX 1234",
    "credit_limit": 100000,
    "available_credit": 85000
  },
  "owner_details": {
    "name": "CARDHOLDER NAME",
    "email": "email@example.com"
  },
  "statement_period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "due_date": "2024-02-10"
  },
  "summary": {
    "total_dues": 15000,
    "minimum_due": 750,
    "previous_balance": 0,
    "payment_received": 0,
    "purchase_amount": 15000
  },
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "SWIGGY BANGALORE",
      "amount": 450.00,
      "type": "Dr",
      "category": "online_food_ordering"
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

3. **Type:** 
   - "Dr" = Debit/Spend/Purchase (money going out)
   - "Cr" = Credit/Payment/Refund (money coming in)

4. **Category:** Assign one of our 21 categories to EVERY transaction
${CATEGORY_DESCRIPTIONS}

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

${examples ? `\n**EXAMPLE OUTPUT FOR REFERENCE:**\n${examples}\n` : ''}

**IMPORTANT:** Return ONLY valid JSON. No markdown, no explanations, no additional text.`;
}

/**
 * Few-shot example for HDFC statements
 */
export const HDFC_EXAMPLE = `
Example for HDFC Bank Statement:

{
  "bank": "HDFC",
  "card_details": {
    "card_type": "HDFC Bank Regalia Credit Card",
    "masked_number": "XXXX XXXX XXXX 1271",
    "credit_limit": 500000,
    "available_credit": 478000
  },
  "owner_details": {
    "name": "JOHN DOE",
    "email": "john@example.com"
  },
  "statement_period": {
    "start_date": "2024-01-05",
    "end_date": "2024-02-04",
    "due_date": "2024-02-21"
  },
  "summary": {
    "total_dues": 22000,
    "minimum_due": 1100,
    "previous_balance": 0,
    "payment_received": 0,
    "purchase_amount": 22000
  },
  "transactions": [
    {
      "date": "2024-01-08",
      "description": "SWIGGY",
      "amount": 450.00,
      "type": "Dr",
      "category": "online_food_ordering"
    },
    {
      "date": "2024-01-10",
      "description": "AMAZON PAYMENTS INDIA",
      "amount": 2599.00,
      "type": "Dr",
      "category": "amazon_spends"
    },
    {
      "date": "2024-01-15",
      "description": "CAFE COFFEE DAY",
      "amount": 385.00,
      "type": "Dr",
      "category": "dining_or_going_out"
    }
  ]
}
`;

/**
 * Few-shot example for Axis statements
 */
export const AXIS_EXAMPLE = `
Example for Axis Bank Statement:

{
  "bank": "AXIS",
  "card_details": {
    "card_type": "Axis Bank Magnus Credit Card",
    "masked_number": "XXXX XXXX XXXX 4567",
    "credit_limit": 1000000,
    "available_credit": 945000
  },
  "owner_details": {
    "name": "JANE SMITH"
  },
  "statement_period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "due_date": "2024-02-15"
  },
  "summary": {
    "total_dues": 55000,
    "minimum_due": 2750,
    "previous_balance": 0,
    "purchase_amount": 55000
  },
  "transactions": [
    {
      "date": "2024-01-05",
      "description": "INDIGO AIRLINES",
      "amount": 15000.00,
      "type": "Dr",
      "category": "flights"
    },
    {
      "date": "2024-01-06",
      "description": "MARRIOTT HOTEL",
      "amount": 8500.00,
      "type": "Dr",
      "category": "hotels"
    },
    {
      "date": "2024-01-12",
      "description": "JIO RECHARGE",
      "amount": 699.00,
      "type": "Dr",
      "category": "mobile_phone_bills"
    }
  ]
}
`;

/**
 * Get bank-specific example if available
 */
export function getBankExample(bank?: string): string {
  if (!bank) return '';
  
  switch (bank.toUpperCase()) {
    case 'HDFC':
      return HDFC_EXAMPLE;
    case 'AXIS':
      return AXIS_EXAMPLE;
    default:
      return '';
  }
}


