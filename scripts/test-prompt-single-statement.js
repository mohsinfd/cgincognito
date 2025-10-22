/**
 * Test LLM prompt with a single statement
 * Tests parsing accuracy without full Gmail sync
 * 
 * Usage:
 * 1. Set OPENAI_API_KEY in environment
 * 2. Place a test PDF in project root (e.g., test-statement.pdf)
 * 3. Run: node scripts/test-prompt-single-statement.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Configuration
const TEST_PDF = process.argv[2] || 'test-statement.pdf'; // Pass PDF path as argument
const PASSWORD = process.argv[3] || ''; // Pass password as argument
const BANK_CODE = process.argv[4] || 'hdfc'; // Pass bank code as argument

async function testPrompt() {
  console.log('🧪 Testing LLM Prompt on Single Statement');
  console.log('='.repeat(80));
  console.log(`📄 PDF: ${TEST_PDF}`);
  console.log(`🔐 Password: ${PASSWORD || '(none)'}`);
  console.log(`🏦 Bank: ${BANK_CODE}`);
  console.log('='.repeat(80));

  // Check if file exists
  if (!fs.existsSync(TEST_PDF)) {
    console.error(`\n❌ Error: File not found: ${TEST_PDF}`);
    console.log('\n💡 Usage:');
    console.log('   node scripts/test-prompt-single-statement.js <pdf-path> <password> <bank-code>');
    console.log('\n📝 Example:');
    console.log('   node scripts/test-prompt-single-statement.js ./my-statement.pdf MOHS1510 hdfc');
    process.exit(1);
  }

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('\n❌ Error: OPENAI_API_KEY not set');
    console.log('\n💡 Set it with:');
    console.log('   $env:OPENAI_API_KEY="your-key-here"  # PowerShell');
    console.log('   export OPENAI_API_KEY="your-key-here"  # Bash');
    process.exit(1);
  }

  try {
    // Step 1: Decrypt PDF with qpdf
    console.log('\n🔓 Step 1: Decrypting PDF...');
    const tempDir = path.join(process.cwd(), 'temp-decrypted');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const inputPath = path.resolve(TEST_PDF);
    const outputPath = path.join(tempDir, `decrypted-${Date.now()}.pdf`);

    // Use full qpdf path (adjust if needed)
    const qpdfPath = process.platform === 'win32' 
      ? 'C:\\Program Files (x86)\\qpdf 12.2.0\\bin\\qpdf.exe'
      : 'qpdf';

    const decryptArgs = [
      `--password=${PASSWORD}`,
      '--decrypt',
      inputPath,
      outputPath
    ];

    const decryptResult = spawnSync(qpdfPath, decryptArgs, { 
      encoding: 'utf8',
      timeout: 30000 
    });

    if (decryptResult.error) {
      console.error('❌ Decryption command error:', decryptResult.error.message);
      process.exit(1);
    }

    if (decryptResult.status !== 0 && decryptResult.status !== 3) {
      console.error('❌ Decryption failed:');
      if (decryptResult.stderr) {
        console.error(decryptResult.stderr);
      }
      if (decryptResult.stdout) {
        console.error(decryptResult.stdout);
      }
      console.error('Exit code:', decryptResult.status);
      process.exit(1);
    }

    // Check if output file was created
    if (!fs.existsSync(outputPath)) {
      console.error('❌ Decryption failed: Output file not created');
      console.error('This usually means wrong password or unsupported encryption');
      process.exit(1);
    }

    console.log('✅ PDF decrypted successfully');

    // Step 2: Extract text using standalone script
    console.log('\n📖 Step 2: Extracting text...');
    const extractScript = path.join(process.cwd(), 'scripts', 'extract-text.js');
    const textOutputPath = path.join(tempDir, `text-${Date.now()}.json`);

    const extractResult = spawnSync('node', [extractScript, outputPath, textOutputPath], {
      encoding: 'utf8',
      timeout: 60000,
      cwd: process.cwd()
    });

    if (extractResult.error) {
      console.error('❌ Text extraction command error:', extractResult.error.message);
      process.exit(1);
    }

    if (extractResult.status !== 0) {
      console.error('❌ Text extraction failed:');
      if (extractResult.stderr) {
        console.error(extractResult.stderr);
      }
      if (extractResult.stdout) {
        console.error(extractResult.stdout);
      }
      console.error('Exit code:', extractResult.status);
      process.exit(1);
    }

    if (!fs.existsSync(textOutputPath)) {
      console.error('❌ Text extraction failed: Output file not created');
      console.error('Script may have failed silently');
      if (extractResult.stdout) {
        console.error('stdout:', extractResult.stdout);
      }
      if (extractResult.stderr) {
        console.error('stderr:', extractResult.stderr);
      }
      process.exit(1);
    }

    const extractedData = JSON.parse(fs.readFileSync(textOutputPath, 'utf8'));
    const text = extractedData.text;
    
    console.log('✅ Text extracted successfully');
    console.log(`📊 Length: ${text.length} characters`);
    console.log(`📄 Pages: ${extractedData.numpages}`);
    console.log('\n📝 Preview (first 500 chars):');
    console.log('-'.repeat(80));
    console.log(text.substring(0, 500));
    console.log('-'.repeat(80));

    // Step 3: Call OpenAI with improved prompt
    console.log('\n🤖 Step 3: Parsing with OpenAI...');
    console.log('⏳ This may take 10-30 seconds...\n');

    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `You are an expert Indian credit card statement parser. Extract ALL transaction data from this statement.

**Bank:** ${BANK_CODE}

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

3. **Amount Handling:**
   - ALL amounts must be POSITIVE numbers (no negative signs)
   - The "type" field (Dr/Cr) indicates the transaction direction
   - Remove currency symbols, commas, and spaces from amounts
   - Example: "₹1,234.56" should become 1234.56

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
  "bank": "${BANK_CODE}",
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

    const startTime = Date.now();
    
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

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ OpenAI parsing complete (${elapsedTime}s)`);

    // Step 4: Analyze results
    console.log('\n📊 Step 4: Analyzing Results...');
    console.log('='.repeat(80));

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);
    let transactions = parsed.transactions || [];
    
    // Post-processing: Filter out any bank fees/charges that LLM might have missed
    const originalCount = transactions.length;
    const excludePatterns = [
      /fin.*chg/i, /finance.*charge/i, /interest/i, /late.*fee/i,
      /annual.*fee/i, /membership.*fee/i, /gst/i, /igst/i, /cgst/i, /sgst/i,
      /assessment/i, /tax.*on/i, /service.*charge/i, /processing.*fee/i,
      /cashback/i, /reward/i, /reversal/i, /refund.*fee/i, /over.*limit/i
    ];
    
    transactions = transactions.filter(t => {
      const desc = (t.description || '').toLowerCase();
      const shouldExclude = excludePatterns.some(pattern => pattern.test(desc));
      if (shouldExclude) {
        console.log(`   ⚠️  Filtered out: "${t.description}" (₹${t.amount})`);
      }
      return !shouldExclude;
    });
    
    if (originalCount !== transactions.length) {
      console.log(`   📝 Filtered ${originalCount - transactions.length} fee/charge transactions`);
    }

    console.log(`\n🎯 SUMMARY:`);
    console.log(`   Total Transactions: ${transactions.length}`);
    
    // Count by type
    const debits = transactions.filter(t => t.type === 'Dr');
    const credits = transactions.filter(t => t.type === 'Cr');
    
    console.log(`   Debits (Dr): ${debits.length}`);
    console.log(`   Credits (Cr): ${credits.length}`);
    
    // Calculate totals
    const debitTotal = debits.reduce((sum, t) => sum + t.amount, 0);
    const creditTotal = credits.reduce((sum, t) => sum + t.amount, 0);
    
    console.log(`\n💰 TOTALS:`);
    console.log(`   Total Spending (Dr): ₹${debitTotal.toLocaleString('en-IN')}`);
    console.log(`   Total Credits (Cr): ₹${creditTotal.toLocaleString('en-IN')}`);
    console.log(`   Net: ₹${(debitTotal - creditTotal).toLocaleString('en-IN')}`);

    // Category breakdown
    const categoryTotals = {};
    debits.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    console.log(`\n📂 CATEGORY BREAKDOWN (Debits only):`);
    Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, amount]) => {
        const percentage = ((amount / debitTotal) * 100).toFixed(1);
        console.log(`   ${category.padEnd(30)} ₹${amount.toLocaleString('en-IN').padStart(12)} (${percentage}%)`);
      });

    // Show sample transactions
    console.log(`\n📝 SAMPLE TRANSACTIONS:`);
    console.log('-'.repeat(80));
    console.log('First 5 Debits:');
    debits.slice(0, 5).forEach((t, i) => {
      console.log(`\n${i + 1}. ${t.description}`);
      console.log(`   Date: ${t.date} | Amount: ₹${t.amount.toLocaleString('en-IN')} | Category: ${t.category}`);
    });

    if (credits.length > 0) {
      console.log('\n' + '-'.repeat(80));
      console.log('First 3 Credits:');
      credits.slice(0, 3).forEach((t, i) => {
        console.log(`\n${i + 1}. ${t.description}`);
        console.log(`   Date: ${t.date} | Amount: ₹${t.amount.toLocaleString('en-IN')}`);
      });
    }

    // Save full output to file
    const outputFile = path.join(tempDir, `parsed-output-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(parsed, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Full output saved to: ${outputFile}`);
    console.log('\n🎉 Test complete!');

    // Cleanup temp files
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      if (fs.existsSync(textOutputPath)) fs.unlinkSync(textOutputPath);
    } catch (e) {
      // Ignore cleanup errors
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testPrompt();

