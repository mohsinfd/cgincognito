#!/usr/bin/env node

/**
 * RBL Password Testing
 * Test different RBL password formats
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_PASSWORDS = [
  // DOB variations
  '15101985',    // Full DOB
  '151019',      // DOB YY
  '1510',        // DDMM
  '1985',        // Year only
  '15',          // Day only
  '10',          // Month only
  
  // Card variations
  '4400',        // Last 4
  '004400',      // Padded last 4
  
  // Common defaults
  '0000',
  '1234',
  'password',
  '123456',
  
  // RBL specific (might be different)
  '15101985',    // Full DOB again
  '151019',      // DOB YY again
];

function tryPassword(pdfPath, password) {
  try {
    const tempDir = path.join(process.cwd(), 'temp-decrypted');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const decryptedPath = path.join(tempDir, `rbl-test-${Date.now()}.pdf`);
    const qpdfPath = 'C:\\Program Files (x86)\\qpdf 12.2.0\\bin\\qpdf.exe';
    
    const result = spawnSync(qpdfPath, [
      '--password=' + password,
      '--decrypt',
      pdfPath,
      decryptedPath
    ], { encoding: 'utf-8' });
    
    if (result.status === 0 || result.status === 3) {
      console.log(`✅ SUCCESS with password: "${password}"`);
      // Cleanup
      try {
        fs.unlinkSync(decryptedPath);
      } catch (e) {}
      return true;
    } else {
      console.log(`❌ Failed: "${password}"`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error with "${password}": ${error.message}`);
    return false;
  }
}

async function main() {
  const pdfPath = path.join(process.cwd(), 'xxxx-xxxx-xx-xxxx01_105603042_22-09-2025.pdf');
  
  console.log('🔍 RBL Password Testing');
  console.log('=======================');
  console.log(`📁 PDF: ${pdfPath}`);
  
  for (let i = 0; i < TEST_PASSWORDS.length; i++) {
    const password = TEST_PASSWORDS[i];
    console.log(`\n🔑 Attempt ${i + 1}/${TEST_PASSWORDS.length}: "${password}"`);
    
    if (tryPassword(pdfPath, password)) {
      console.log(`🎉 RBL password found: "${password}"`);
      return;
    }
  }
  
  console.log(`\n💥 All RBL password attempts failed`);
  console.log(`💡 RBL might use a different format or the PDF might not be password protected`);
}

if (require.main === module) {
  main().catch(console.error);
}
