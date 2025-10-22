#!/usr/bin/env node

/**
 * Bulk Statement Processing with Dynamic Form
 * Processes statements using dynamic form requirements
 * Usage: node scripts/bulk-process-dynamic.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { generateDynamicForm, generatePasswordAttempts, BANK_REQUIREMENTS } = require('./dynamic-form-generator');

// Actual statements from your downloads
const DETECTED_STATEMENTS = [
  { bank: 'hsbc', filename: '20251008.pdf', messageId: 'hsbc-msg-1' },
  { bank: 'hdfc', filename: '5522XXXXXXXXXX59_14-10-2025_588.pdf', messageId: 'hdfc-msg-1' },
  { bank: 'rbl', filename: 'xxxx-xxxx-xx-xxxx01_105603042_22-09-2025.pdf', messageId: 'rbl-msg-1' },
  { bank: 'idfc', filename: '40000001396045_21092025_192214583.pdf', messageId: 'idfc-msg-1' },
  { bank: 'yes', filename: '122009_1005060000047727-691.pdf', messageId: 'yes-msg-1' },
];

// Sample user details (replace with actual form input)
const USER_DETAILS = {
  name: "Mohsin",
  dob: "15101985",
  card_last6: "404400", // HSBC card last 6 digits
  card_last4: "9131"    // SBI card last 4 digits
};

async function processStatement(statement, userDetails) {
  console.log(`\n🔄 Processing ${statement.bank.toUpperCase()}: ${statement.filename}`);
  
  const pdfPath = path.join(process.cwd(), statement.filename);
  
  // Check if file exists
  if (!fs.existsSync(pdfPath)) {
    console.log(`❌ File not found: ${pdfPath}`);
    return { success: false, error: 'File not found' };
  }
  
  // Generate password attempts using dynamic form logic
  const attempts = generatePasswordAttempts(userDetails, statement.bank);
  
  if (attempts.length === 0) {
    console.log(`❌ No password attempts generated - missing required fields`);
    return { success: false, error: 'Missing required fields' };
  }
  
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

function tryQpdfDecryption(pdfPath, password) {
  try {
    const tempDir = path.join(process.cwd(), 'temp-decrypted');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const decryptedPath = path.join(tempDir, `bulk-decrypted-${Date.now()}.pdf`);
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
    
    // Clean up markdown code blocks if present
    let cleanContent = content;
    if (cleanContent.includes('```json')) {
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanContent.includes('```')) {
      cleanContent = cleanContent.replace(/```\n?/g, '');
    }
    
    const parsed = JSON.parse(cleanContent);
    
    return {
      success: true,
      transactionCount: parsed.transactions ? parsed.transactions.length : 0,
      data: parsed
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function validateUserDetails(userDetails, statements) {
  const banksPresent = [...new Set(statements.map(s => s.bank))];
  const missingFields = [];
  
  banksPresent.forEach(bank => {
    const requirements = BANK_REQUIREMENTS[bank];
    if (requirements) {
      requirements.fields.forEach(field => {
        if (!userDetails[field]) {
          missingFields.push(`${field} (required for ${bank.toUpperCase()})`);
        }
      });
    }
  });
  
  return missingFields;
}

async function main() {
  console.log('🚀 Bulk Statement Processing with Dynamic Form');
  console.log('===============================================');
  
  // Generate dynamic form structure
  const formStructure = generateDynamicForm(DETECTED_STATEMENTS);
  
  console.log(`📊 Processing ${DETECTED_STATEMENTS.length} statements`);
  console.log(`🏦 Banks: ${formStructure.banks.map(b => b.name).join(', ')}`);
  console.log(`👤 User: ${USER_DETAILS.name}, DOB: ${USER_DETAILS.dob}`);
  
  // Validate user details
  const missingFields = validateUserDetails(USER_DETAILS, DETECTED_STATEMENTS);
  if (missingFields.length > 0) {
    console.log(`\n❌ Missing required fields:`);
    missingFields.forEach(field => {
      console.log(`   • ${field}`);
    });
    console.log(`\n💡 Please provide all required fields and try again.`);
    return;
  }
  
  console.log(`\n✅ All required fields provided`);
  
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  
  // Process each statement
  for (const statement of DETECTED_STATEMENTS) {
    const result = await processStatement(statement, USER_DETAILS);
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
  console.log(`📈 Success Rate: ${((successCount / DETECTED_STATEMENTS.length) * 100).toFixed(1)}%`);
  
  // Save results
  const resultsPath = path.join(process.cwd(), 'temp-decrypted', `bulk-dynamic-results-${Date.now()}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`💾 Results saved to: ${resultsPath}`);
  
  // Show successful passwords for reference
  const successfulPasswords = results
    .filter(r => r.result.success)
    .map(r => ({ bank: r.statement.bank, password: r.result.password }));
  
  if (successfulPasswords.length > 0) {
    console.log(`\n🔑 Successful Passwords:`);
    successfulPasswords.forEach(p => {
      console.log(`   ${p.bank.toUpperCase()}: "${p.password}"`);
    });
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processStatement, validateUserDetails };
