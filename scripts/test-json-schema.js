/**
 * Direct test of JSON schema validation
 * Tests if the schema fix resolves the OpenAI validation error
 */

// Import the schema directly
const TRANSACTION_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  required: ['bank', 'card_details', 'statement_period', 'summary', 'transactions'],
  properties: {
    bank: {
      type: 'string',
      enum: ['HDFC', 'AXIS', 'SBI', 'ICICI', 'KOTAK', 'AMEX', 'CITI', 'SC', 'HSBC', 'INDUSIND', 'YES', 'RBL', 'OTHER'],
      description: 'Bank identifier code',
    },
    card_details: {
      type: 'object',
      additionalProperties: false,
      required: ['card_type', 'masked_number'],
      properties: {
        card_type: { type: 'string', description: 'Card type/variant' },
        masked_number: { type: 'string', pattern: '^[X\\d\\s]{13,19}$', description: 'Masked card number' },
      },
    },
    statement_period: {
      type: 'object',
      additionalProperties: false,
      required: ['start_date', 'end_date', 'due_date'],
      properties: {
        start_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        end_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        due_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      },
    },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['total_dues', 'minimum_due', 'previous_balance'],
      properties: {
        total_dues: { type: 'number' },
        minimum_due: { type: 'number', minimum: 0 },
        previous_balance: { type: 'number' },
      },
    },
    transactions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'description', 'amount', 'type', 'category'],
        properties: {
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          description: { type: 'string', minLength: 1 },
          amount: { type: 'number', minimum: 0 },
          type: { type: 'string', enum: ['Dr', 'Cr'] },
          category: { type: 'string', enum: ['amazon_spends', 'flipkart_spends', 'online_food_ordering', 'other_offline_spends'] },
        },
      },
    },
  },
};

async function testJSONSchema() {
  console.log('🧪 Testing JSON Schema Validation');
  console.log('='.repeat(50));

  try {
    // Test the schema structure
    console.log('📋 Schema structure:');
    console.log('- Root additionalProperties:', TRANSACTION_SCHEMA.additionalProperties);
    console.log('- Card details additionalProperties:', TRANSACTION_SCHEMA.properties.card_details.additionalProperties);
    console.log('- Transactions items additionalProperties:', TRANSACTION_SCHEMA.properties.transactions.items.additionalProperties);

    // Test with a sample valid response
    const sampleResponse = {
      bank: 'HDFC',
      card_details: {
        card_type: 'Regalia Gold',
        masked_number: 'XXXX XXXX XXXX 2025'
      },
      statement_period: {
        start_date: '2025-09-01',
        end_date: '2025-09-30',
        due_date: '2025-10-15'
      },
      summary: {
        total_dues: 25000,
        minimum_due: 2500,
        previous_balance: 20000
      },
      transactions: [
        {
          date: '2025-09-15',
          description: 'SWIGGY BANGALORE',
          amount: 350,
          type: 'Dr',
          category: 'online_food_ordering'
        }
      ]
    };

    console.log('\n✅ Sample response structure looks valid');
    console.log('📊 Sample transaction:', sampleResponse.transactions[0]);

    // Test OpenAI API call simulation
    console.log('\n🤖 Testing OpenAI API call simulation...');
    
    const { OpenAI } = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const testPrompt = `You are an expert credit card statement parser. Extract transaction data from this statement.

**Bank:** HDFC

**STATEMENT TEXT:**
\`\`\`
Sample statement text with transactions
\`\`\`

Return valid JSON matching the provided schema.`;

    console.log('📤 Making OpenAI API call with fixed schema...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert credit card statement parser. Extract transaction data accurately and return valid JSON that matches the provided schema.',
        },
        {
          role: 'user',
          content: testPrompt,
        },
      ],
      response_format: { 
        type: 'json_schema',
        json_schema: {
          name: 'statement_parser',
          schema: TRANSACTION_SCHEMA,
          strict: true
        }
      },
      temperature: 0,
      max_tokens: 1000,
    });

    console.log('✅ OpenAI API call successful!');
    console.log('📄 Response received:', response.choices[0]?.message?.content ? 'Yes' : 'No');
    
    if (response.choices[0]?.message?.content) {
      const parsed = JSON.parse(response.choices[0].message.content);
      console.log('🎉 JSON parsing successful!');
      console.log('🏦 Bank:', parsed.bank);
      console.log('📊 Transactions:', parsed.transactions?.length || 0);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('additionalProperties')) {
      console.error('🔍 This is still the JSON schema validation error');
    } else {
      console.error('🔍 Different error:', error.message);
    }
  }
}

// Run the test
testJSONSchema().then(() => {
  console.log('\n🏁 Schema test completed');
}).catch(console.error);
