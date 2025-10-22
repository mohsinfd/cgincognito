/**
 * Quick test to verify the JSON schema fix works with OpenAI
 * Tests the EXACT schema from the V2 API
 */

async function testSchemaFix() {
  console.log('🧪 Testing V2 API Schema Fix with OpenAI');
  console.log('='.repeat(60));

  try {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use a simple test statement
    const testText = `
HDFC Bank Credit Card Statement
Statement Period: 01-Sep-2025 to 30-Sep-2025
Card Number: XXXX XXXX XXXX 1234

Transactions:
15-Sep-2025  SWIGGY BANGALORE           350.00 Dr
16-Sep-2025  AMAZON INDIA              1200.00 Dr
17-Sep-2025  PAYMENT RECEIVED          5000.00 Cr
`;

    console.log('📝 Test statement prepared');
    console.log('🔐 Calling OpenAI with fixed schema...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert credit card statement parser. Extract transaction data accurately and return valid JSON that matches the provided schema.',
        },
        {
          role: 'user',
          content: `Extract transaction data from this statement:

${testText}

Return JSON with: bank, transactions (array with date, description, amount, type, category)`,
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
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    console.log('✅ OpenAI API call successful!');
    console.log('📊 Response received');

    const parsed = JSON.parse(content);
    console.log('✅ JSON parsing successful!');
    console.log('\n📋 Parsed Data:');
    console.log(`   Bank: ${parsed.bank}`);
    console.log(`   Transactions: ${parsed.transactions?.length || 0}`);
    
    if (parsed.transactions && parsed.transactions.length > 0) {
      console.log('\n💳 Sample Transaction:');
      const txn = parsed.transactions[0];
      console.log(`   Date: ${txn.date}`);
      console.log(`   Description: ${txn.description}`);
      console.log(`   Amount: ₹${txn.amount}`);
      console.log(`   Type: ${txn.type}`);
      console.log(`   Category: ${txn.category}`);
    }

    console.log('\n🎉 Schema validation PASSED!');
    console.log('✅ The V2 API fix is working correctly!');
    console.log('\n👍 You can now safely process statements with the V2 API.');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable not set');
  console.error('Run: $env:OPENAI_API_KEY="your-key"; node scripts/test-schema-fix.js');
  process.exit(1);
}

testSchemaFix();

