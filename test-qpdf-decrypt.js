const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Configuration
const QPDF_PATH = 'C:\\Program Files (x86)\\qpdf 12.2.0\\bin\\qpdf.exe';
const PASSWORD = '151085404400';

// You can change this to test with a real PDF file
const PDF_FILE = process.argv[2] || 'test-input.pdf';

console.log('🧪 QPDF Decryption Test');
console.log('='.repeat(80));
console.log('📁 Input PDF:', PDF_FILE);
console.log('🔐 Password:', PASSWORD);
console.log('🛠️  QPDF Path:', QPDF_PATH);
console.log('='.repeat(80));

// Check if qpdf exists
if (!fs.existsSync(QPDF_PATH)) {
  console.error('❌ qpdf not found at:', QPDF_PATH);
  process.exit(1);
}

// Check if input PDF exists
if (!fs.existsSync(PDF_FILE)) {
  console.error('❌ PDF file not found:', PDF_FILE);
  console.log('\nUsage: node test-qpdf-decrypt.js <path-to-pdf>');
  process.exit(1);
}

// Create temp directory
const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qpdf-test-'));
const inPath = path.join(tmpDir, 'in.pdf');
const outPath = path.join(tmpDir, 'out.pdf');

console.log('\n📂 Temp directory:', tmpDir);

// Copy input PDF to temp
fs.copyFileSync(PDF_FILE, inPath);
console.log('✅ Copied input PDF to temp');

// Run qpdf
console.log('\n🔄 Running qpdf...');
const args = [
  `--password=${PASSWORD}`,
  '--decrypt',
  inPath,
  outPath,
];

console.log('Command:', QPDF_PATH, args.join(' '));
console.log('');

const result = spawnSync(QPDF_PATH, args, { encoding: 'utf-8' });

console.log('📊 QPDF Result:');
console.log('  Exit code:', result.status);
console.log('  STDOUT:', result.stdout || '(empty)');
console.log('  STDERR:', result.stderr || '(empty)');

// Check if output exists
const outputExists = fs.existsSync(outPath);
const outputSize = outputExists ? fs.statSync(outPath).size : 0;

console.log('\n📄 Output File:');
console.log('  Exists:', outputExists);
console.log('  Size:', outputSize, 'bytes');

if (result.status === 0 || (result.status === 3 && outputExists && outputSize > 0)) {
  console.log('\n✅ SUCCESS! PDF decrypted successfully');
  
  // Save decrypted PDF to current directory
  const outputFile = 'decrypted-output.pdf';
  fs.copyFileSync(outPath, outputFile);
  console.log('💾 Decrypted PDF saved to:', outputFile);
} else {
  console.log('\n❌ FAILED! PDF decryption failed');
  
  if (result.stderr?.toLowerCase().includes('invalid password')) {
    console.log('🔒 Reason: Invalid password');
  }
}

// Cleanup
console.log('\n🧹 Cleaning up temp files...');
try {
  fs.unlinkSync(inPath);
  fs.unlinkSync(outPath);
  fs.rmdirSync(tmpDir);
  console.log('✅ Cleanup complete');
} catch (err) {
  console.log('⚠️ Cleanup error:', err.message);
}

console.log('\n' + '='.repeat(80));
console.log('Test complete!');


