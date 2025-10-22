#!/usr/bin/env node

/**
 * Test the extract-text.js fix
 * Usage: node scripts/test-extract-fix.js <pdf-file>
 */

const { spawnSync } = require('child_process');
const path = require('path');

async function testExtractFix(pdfPath) {
  console.log(`🧪 Testing extract-text.js fix with: ${pdfPath}`);
  
  const extractorPath = path.join(process.cwd(), 'scripts', 'extract-text.js');
  const result = spawnSync(process.execPath, [extractorPath, pdfPath], { 
    encoding: 'utf-8',
    timeout: 10000
  });
  
  console.log(`📊 Exit code: ${result.status}`);
  console.log(`📤 Stdout length: ${result.stdout.length}`);
  console.log(`📥 Stderr length: ${result.stderr.length}`);
  
  if (result.status === 0) {
    try {
      const parsed = JSON.parse(result.stdout);
      console.log(`✅ JSON parsing successful`);
      console.log(`📄 Pages: ${parsed.numpages}`);
      console.log(`📝 Text length: ${parsed.text.length}`);
      console.log(`📋 First 200 chars: ${parsed.text.substring(0, 200)}...`);
    } catch (error) {
      console.log(`❌ JSON parsing failed: ${error.message}`);
      console.log(`📤 Raw stdout: ${result.stdout.substring(0, 500)}`);
    }
  } else {
    console.log(`❌ Script failed`);
    console.log(`📥 Stderr: ${result.stderr}`);
  }
}

if (require.main === module) {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.log('Usage: node scripts/test-extract-fix.js <pdf-file>');
    process.exit(1);
  }
  testExtractFix(pdfPath).catch(console.error);
}

