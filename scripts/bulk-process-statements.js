#!/usr/bin/env node

/**
 * Bulk Statement Processing Script
 * Processes all 21 statements without Gmail fetching
 * Usage: node scripts/bulk-process-statements.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Mock user details for testing
const USER_DETAILS = {
  name: "Mohsin", // Replace with your actual name
  dob: "15101985", // Replace with your actual DOB
  cardNumbers: [
    "4400", // HSBC
    "3159", // HDFC
    "3131", // Axis Flipkart
    "8383", // Axis Magnus
    "0001", // RBL
    "3945", // IDFC
    "9131", // SBI
    "7727", // YES Bank
    // Add more as needed
  ]
};

// Bank-specific password rules
const BANK_RULES = {
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

// Mock statement data (replace with your actual statement filenames)
const MOCK_STATEMENTS = [
  { bank: 'hsbc', filename: '20251008.pdf', cardLast4: '4400' },
  { bank: 'hdfc', filename: '5522XXXXXXXXXX59_14-10-2025_588.pdf', cardLast4: '3159' },
  { bank: 'axis', filename: 'Credit Card Statement.pdf', cardLast4: '3131' },
  { bank: 'rbl', filename: 'xxxx-xxxx-xx-xxxx01_105603042_22-09-2025.pdf', cardLast4: '0001' },
  { bank: 'idfc', filename: '40000001396045_21092025_192214583.pdf', cardLast4: '3945' },
  { bank: 'sbi', filename: '8796326479959131_17092025.pdf', cardLast4: '9131' },
  { bank: 'yes', filename: '122009_1005060000047727-691.pdf', cardLast4: '7727' },
  // Add more statements as needed
];

async function processStatement(statement) {
  console.log(`\n🔄 Processing ${statement.bank.toUpperCase()}: ${statement.filename}`);
  
  const pdfPath = path.join(process.cwd(), statement.filename);
  
  // Check if file exists
  if (!fs.existsSync(pdfPath)) {
    console.log(`❌ File not found: ${pdfPath}`);
    return { success: false, error: 'File not found' };
  }
  
  // Generate password attempts based on bank rules
  const bankRules = BANK_RULES[statement.bank];
  if (!bankRules) {
    console.log(`❌ No rules defined for bank: ${statement.bank}`);
    return { success: false, error: 'No bank rules' };
  }
  
  // Check required fields
  const missingFields = [];
  if (bankRules.requiredFields.includes('name') && !USER_DETAILS.name) missingFields.push('name');
  if (bankRules.requiredFields.includes('dob') && !USER_DETAILS.dob) missingFields.push('dob');
  if (bankRules.requiredFields.includes('card_last4') && !statement.cardLast4) missingFields.push('card_last4');
  if (bankRules.requiredFields.includes('card_last6') && !statement.cardLast4) missingFields.push('card_last6');
  
  if (missingFields.length > 0) {
    console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
    return { success: false, error: `Missing fields: ${missingFields.join(', ')}` };
  }
  
  // Generate password attempts
  const attempts = generatePasswordAttempts(statement, USER_DETAILS);
  console.log(`🔐 Generated ${attempts.length} password attempts`);
  
  // Try each password
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    console.log(`🔑 Attempt ${i + 1}/${attempts.length}: "${attempt.password}" (${attempt.source})`);
    
    try {
      // Try qpdf decryption
      const result = tryQpdfDecryption(pdfPath, attempt.password);
      if (result.success) {
        console.log(`✅ Success with password: "${attempt.password}"`);
        
        // Extract text from decrypted PDF
        const textResult = extractTextFromDecryptedPDF(result.decryptedPath);
        if (textResult.success) {
          console.log(`📄 Extracted text: ${textResult.text.length} characters`);
          
          // Parse with OpenAI
          const parseResult = await parseWithOpenAI(textResult.text, statement.bank);
          if (parseResult.success) {
            console.log(`🤖 Parsed successfully: ${parseResult.transactionCount} transactions`);
            
            // Cleanup
            fs.unlinkSync(result.decryptedPath);
            
            return {
              success: true,
              password: attempt.password,
              transactionCount: parseResult.transactionCount,
              data: parseResult.data
            };
          } else {
            console.log(`❌ OpenAI parsing failed: ${parseResult.error}`);
          }
        } else {
          console.log(`❌ Text extraction failed: ${textResult.error}`);
        }
        
        // Cleanup on failure
        if (fs.existsSync(result.decryptedPath)) {
          fs.unlinkSync(result.decryptedPath);
        }
      } else {
        console.log(`❌ Decryption failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log(`💥 All password attempts failed for ${statement.filename}`);
  return { success: false, error: 'All password attempts failed' };
}

function generatePasswordAttempts(statement, userDetails) {
  const attempts = [];
  const bankRules = BANK_RULES[statement.bank];
  
  // Bank-specific password generation
  switch (statement.bank) {
    case 'hsbc':
      // DDMMYYYY + last 6 digits
      const dob = userDetails.dob;
      const cardLast6 = statement.cardLast4.padStart(6, '0');
      attempts.push({ password: dob, source: 'dob-full' });
      attempts.push({ password: dob.substring(0, 6), source: 'dob-yy' });
      attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' });
      attempts.push({ password: cardLast6, source: 'card-last6' });
      // Correct DDMMYY format: DDMM + YY (last 2 digits of year)
      const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // 151085
      attempts.push({ password: ddmmyy + cardLast6, source: 'ddmmyy+card6' });
      break;
      
    case 'hdfc':
      // First 4 letters of name + DOB or card last 4
      const name4 = userDetails.name.substring(0, 4).toUpperCase();
      attempts.push({ password: name4 + userDetails.dob, source: 'name4+dob' });
      attempts.push({ password: name4 + userDetails.dob.substring(0, 4), source: 'name4+ddmm' });
      attempts.push({ password: name4 + statement.cardLast4, source: 'name4+card4' });
      break;
      
    case 'axis':
      // Same as HDFC
      const name4Axis = userDetails.name.substring(0, 4).toUpperCase();
      attempts.push({ password: name4Axis + userDetails.dob.substring(0, 4), source: 'name4+ddmm' });
      attempts.push({ password: name4Axis + statement.cardLast4, source: 'name4+card4' });
      break;
      
    case 'rbl':
      // DOB in DDMM format
      attempts.push({ password: userDetails.dob.substring(0, 4), source: 'dob-ddmm' });
      attempts.push({ password: userDetails.dob, source: 'dob-full' });
      break;
      
    case 'idfc':
      // DOB in DDMM format
      attempts.push({ password: userDetails.dob.substring(0, 4), source: 'dob-ddmm' });
      break;
      
    case 'sbi':
      // DOB + card last 4
      attempts.push({ password: userDetails.dob.substring(0, 4), source: 'dob-ddmm' });
      attempts.push({ password: userDetails.dob.substring(0, 4) + statement.cardLast4, source: 'ddmm+card4' });
      break;
      
    case 'yes':
      // First 4 letters + DOB
      const name4Yes = userDetails.name.substring(0, 4).toUpperCase();
      attempts.push({ password: name4Yes + userDetails.dob.substring(0, 4), source: 'name4+ddmm' });
      break;
  }
  
  return attempts.slice(0, bankRules.maxAttempts);
}

function tryQpdfDecryption(pdfPath, password) {
  try {
    const tempDir = path.join(process.cwd(), 'temp-decrypted');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const decryptedPath = path.join(tempDir, `decrypted-${Date.now()}.pdf`);
    const qpdfPath = 'C:\\Program Files (x86)\\qpdf 12.2.0\\bin\\qpdf.exe';
    
    const result = spawnSync(qpdfPath, [
      '--password=' + password,
      '--decrypt',
      pdfPath,
      decryptedPath
    ], { encoding: 'utf-8' });
    
    if (result.status === 0 || result.status === 3) { // 3 = success with warnings
      return { success: true, decryptedPath };
    } else {
      return { success: false, error: result.stderr || 'qpdf failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function extractTextFromDecryptedPDF(decryptedPath) {
  try {
    const extractorPath = path.join(process.cwd(), 'scripts', 'extract-text.js');
    const result = spawnSync(process.execPath, [extractorPath, decryptedPath], { 
      encoding: 'utf-8',
      timeout: 30000 // 30 second timeout
    });
    
    if (result.status === 0) {
      const parsed = JSON.parse(result.stdout);
      return { success: true, text: parsed.text || '' };
    } else {
      return { success: false, error: result.stderr || result.stdout || 'extraction failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function parseWithOpenAI(text, bankCode) {
  try {
    const openai = require('openai');
    const client = new openai.OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const prompt = `Parse this credit card statement from ${bankCode} bank and extract all transactions in JSON format. Include transaction date, description, amount, and category.`;
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a financial statement parser. Extract transaction data accurately.' },
        { role: 'user', content: `${prompt}\n\nStatement text:\n${text.substring(0, 8000)}` }
      ],
      temperature: 0.1
    });
    
    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    return {
      success: true,
      transactionCount: parsed.transactions ? parsed.transactions.length : 0,
      data: parsed
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Bulk Statement Processing');
  console.log('============================');
  console.log(`📊 Processing ${MOCK_STATEMENTS.length} statements`);
  console.log(`👤 User: ${USER_DETAILS.name}, DOB: ${USER_DETAILS.dob}`);
  console.log(`💳 Cards: ${USER_DETAILS.cardNumbers.join(', ')}`);
  
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (const statement of MOCK_STATEMENTS) {
    const result = await processStatement(statement);
    results.push({ statement, result });
    
    if (result.success) {
      successCount++;
      console.log(`✅ ${statement.bank.toUpperCase()}: SUCCESS`);
    } else {
      failureCount++;
      console.log(`❌ ${statement.bank.toUpperCase()}: FAILED - ${result.error}`);
    }
  }
  
  console.log('\n📊 FINAL RESULTS');
  console.log('================');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📈 Success Rate: ${((successCount / MOCK_STATEMENTS.length) * 100).toFixed(1)}%`);
  
  // Save results
  const resultsPath = path.join(process.cwd(), 'temp-decrypted', `bulk-results-${Date.now()}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`💾 Results saved to: ${resultsPath}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processStatement, generatePasswordAttempts };
