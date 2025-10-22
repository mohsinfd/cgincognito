#!/usr/bin/env node

/**
 * Simple PDF Password Test
 * Tests password generation and decryption for a single PDF
 * Usage: node scripts/test-single-pdf.js <pdf-file> <bank-code>
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Test data
const TEST_DATA = {
  name: "Mohsin",
  dob: "15101985",
  cardLast4: "4400" // HSBC card
};

function generateHSBCPasswords(userDetails, cardLast4) {
  const attempts = [];
  const dob = userDetails.dob;
  const cardLast6 = cardLast4.padStart(6, '0');
  
  // Generate all possible HSBC password combinations
  attempts.push({ password: dob, source: 'dob-full' });
  attempts.push({ password: dob.substring(0, 6), source: 'dob-yy' });
  attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' });
  attempts.push({ password: cardLast6, source: 'card-last6' });
  
  // Correct DDMMYY format: DDMM + YY (last 2 digits of year)
  const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // 151085
  attempts.push({ password: ddmmyy + cardLast6, source: 'ddmmyy+card6' });
  
  // The correct password from your logs: 151085404400
  // This means: DDMMYY (151085) + last 6 digits (404400)
  // But we're generating: DDMMYY (151085) + padded last 4 (004400)
  // The issue is that the last 6 digits should be 404400, not 004400
  const correctLast6 = '404400'; // This should come from the actual card number
  attempts.push({ password: ddmmyy + correctLast6, source: 'ddmmyy+correct-card6' });
  
  // Additional combinations
  attempts.push({ password: dob.substring(0, 4) + cardLast4, source: 'ddmm+card4' });
  attempts.push({ password: dob.substring(0, 6) + cardLast4, source: 'ddmmyy+card4' });
  
  return attempts;
}

function tryQpdfDecryption(pdfPath, password) {
  try {
    const tempDir = path.join(process.cwd(), 'temp-decrypted');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const decryptedPath = path.join(tempDir, `test-decrypted-${Date.now()}.pdf`);
    const qpdfPath = 'C:\\Program Files (x86)\\qpdf 12.2.0\\bin\\qpdf.exe';
    
    console.log(`🔐 Trying password: "${password}"`);
    
    const result = spawnSync(qpdfPath, [
      '--password=' + password,
      '--decrypt',
      pdfPath,
      decryptedPath
    ], { encoding: 'utf-8' });
    
    console.log(`📊 Exit code: ${result.status}`);
    if (result.stderr) {
      console.log(`📥 Stderr: ${result.stderr.substring(0, 200)}...`);
    }
    
    if (result.status === 0 || result.status === 3) { // 3 = success with warnings
      console.log(`✅ SUCCESS! Decrypted to: ${decryptedPath}`);
      return { success: true, decryptedPath };
    } else {
      console.log(`❌ Failed: ${result.stderr || 'qpdf failed'}`);
      return { success: false, error: result.stderr || 'qpdf failed' };
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function testTextExtraction(decryptedPath) {
  try {
    console.log(`📄 Testing text extraction from: ${decryptedPath}`);
    
    const extractorPath = path.join(process.cwd(), 'scripts', 'extract-text.js');
    const result = spawnSync(process.execPath, [extractorPath, decryptedPath], { 
      encoding: 'utf-8',
      timeout: 10000
    });
    
    console.log(`📊 Extraction exit code: ${result.status}`);
    
    if (result.status === 0) {
      try {
        const parsed = JSON.parse(result.stdout);
        console.log(`✅ Text extraction successful`);
        console.log(`📄 Pages: ${parsed.numpages}`);
        console.log(`📝 Text length: ${parsed.text.length}`);
        console.log(`📋 First 200 chars: ${parsed.text.substring(0, 200)}...`);
        
        // Cleanup
        fs.unlinkSync(decryptedPath);
        console.log(`🗑️ Cleaned up decrypted file`);
        
        return { success: true, text: parsed.text };
      } catch (error) {
        console.log(`❌ JSON parsing failed: ${error.message}`);
        console.log(`📤 Raw stdout: ${result.stdout.substring(0, 500)}`);
        return { success: false, error: 'JSON parsing failed' };
      }
    } else {
      console.log(`❌ Text extraction failed`);
      console.log(`📥 Stderr: ${result.stderr}`);
      return { success: false, error: 'Text extraction failed' };
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  const pdfPath = process.argv[2];
  const bankCode = process.argv[3] || 'hsbc';
  
  if (!pdfPath) {
    console.log('Usage: node scripts/test-single-pdf.js <pdf-file> [bank-code]');
    console.log('Example: node scripts/test-single-pdf.js 20251008.pdf hsbc');
    process.exit(1);
  }
  
  console.log('🧪 Single PDF Password Test');
  console.log('============================');
  console.log(`📁 PDF: ${pdfPath}`);
  console.log(`🏦 Bank: ${bankCode.toUpperCase()}`);
  console.log(`👤 User: ${TEST_DATA.name}, DOB: ${TEST_DATA.dob}`);
  console.log(`💳 Card: ****${TEST_DATA.cardLast4}`);
  
  // Check if file exists
  if (!fs.existsSync(pdfPath)) {
    console.log(`❌ File not found: ${pdfPath}`);
    process.exit(1);
  }
  
  // Generate password attempts
  const attempts = generateHSBCPasswords(TEST_DATA, TEST_DATA.cardLast4);
  console.log(`\n🔐 Generated ${attempts.length} password attempts:`);
  attempts.forEach((attempt, i) => {
    console.log(`   ${i + 1}. "${attempt.password}" (${attempt.source})`);
  });
  
  // Try each password
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    console.log(`\n🔑 Attempt ${i + 1}/${attempts.length}: "${attempt.password}" (${attempt.source})`);
    
    const decryptResult = tryQpdfDecryption(pdfPath, attempt.password);
    if (decryptResult.success) {
      console.log(`🎉 PASSWORD FOUND: "${attempt.password}"`);
      
      // Test text extraction
      const extractResult = testTextExtraction(decryptResult.decryptedPath);
      if (extractResult.success) {
        console.log(`✅ Complete success! PDF decrypted and text extracted.`);
        console.log(`📊 Text length: ${extractResult.text.length} characters`);
      } else {
        console.log(`⚠️ Decryption worked but text extraction failed: ${extractResult.error}`);
      }
      
      return; // Stop after first success
    }
  }
  
  console.log(`\n💥 All password attempts failed`);
  console.log(`❌ Could not decrypt PDF with any generated password`);
}

if (require.main === module) {
  main().catch(console.error);
}
