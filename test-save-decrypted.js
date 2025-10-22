const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Configuration
const QPDF_PATH = 'C:\\Program Files (x86)\\qpdf 12.2.0\\bin\\qpdf.exe';
const PASSWORD = '151085404400';
const PDF_FILE = process.argv[2] || '20251008.pdf';

console.log('🧪 Test: Save Decrypted PDF Approach');
console.log('='.repeat(80));
console.log('📁 Input PDF:', PDF_FILE);
console.log('🔐 Password:', PASSWORD);
console.log('='.repeat(80));

// Check if input PDF exists
if (!fs.existsSync(PDF_FILE)) {
  console.error('❌ PDF file not found:', PDF_FILE);
  process.exit(1);
}

// Step 1: Decrypt with qpdf
console.log('\n📋 STEP 1: Decrypt with qpdf');
console.log('-'.repeat(80));

const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qpdf-test-'));
const inPath = path.join(tmpDir, 'in.pdf');
const outPath = path.join(tmpDir, 'out.pdf');

fs.copyFileSync(PDF_FILE, inPath);

const args = [
  `--password=${PASSWORD}`,
  '--decrypt',
  inPath,
  outPath,
];

const result = spawnSync(QPDF_PATH, args, { encoding: 'utf-8' });

console.log('Exit code:', result.status);

const outputExists = fs.existsSync(outPath);
const outputSize = outputExists ? fs.statSync(outPath).size : 0;

console.log('Output exists:', outputExists);
console.log('Output size:', outputSize, 'bytes');

if (result.status === 0 || (result.status === 3 && outputExists && outputSize > 0)) {
  console.log('✅ qpdf decryption succeeded');
} else {
  console.error('❌ qpdf failed:', result.stderr);
  process.exit(1);
}

// Step 2: Save to persistent location
console.log('\n📋 STEP 2: Save to persistent location');
console.log('-'.repeat(80));

const decrypted = fs.readFileSync(outPath);
console.log('Decrypted buffer size:', decrypted.length, 'bytes');

// Create temp-decrypted directory
const persistentDir = path.join(process.cwd(), 'temp-decrypted');
try {
  fs.mkdirSync(persistentDir, { recursive: true });
  console.log('✅ Created directory:', persistentDir);
} catch (err) {
  console.log('⚠️ Directory might already exist');
}

// Save with timestamp
const timestamp = Date.now();
const persistentPath = path.join(persistentDir, `decrypted-${timestamp}.pdf`);
fs.writeFileSync(persistentPath, decrypted);
console.log('✅ Saved decrypted PDF to:', persistentPath);

// Step 3: Verify we can read it back
console.log('\n📋 STEP 3: Verify saved file');
console.log('-'.repeat(80));

const readBack = fs.readFileSync(persistentPath);
console.log('Read back size:', readBack.length, 'bytes');
console.log('Match original?', readBack.length === decrypted.length ? '✅ YES' : '❌ NO');

// Step 4: Try pdf-parse on saved file (from disk)
console.log('\n📋 STEP 4: Extract text from saved file');
console.log('-'.repeat(80));

const pdfParse = require('pdf-parse');

console.log('Attempting pdf-parse on saved file...');
pdfParse(readBack)
  .then(data => {
    console.log('✅ SUCCESS! Text extracted from saved file');
    console.log('Pages:', data.numpages);
    console.log('Text length:', data.text.length, 'characters');
    console.log('\nFirst 300 characters:');
    console.log(data.text.substring(0, 300));
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(80));
    console.log('Summary:');
    console.log('  ✅ qpdf decryption works');
    console.log('  ✅ Saved to persistent location');
    console.log('  ✅ File can be read back');
    console.log('  ✅ pdf-parse extracts text from saved file');
    console.log('\n📁 Decrypted PDF available at:', persistentPath);
    
    // Cleanup temp dir
    try {
      fs.unlinkSync(inPath);
      fs.unlinkSync(outPath);
      fs.rmdirSync(tmpDir);
    } catch {}
  })
  .catch(err => {
    console.error('❌ pdf-parse failed on saved file:', err.message);
    console.log('\n⚠️ This means we need a different text extraction method');
    
    // Cleanup
    try {
      fs.unlinkSync(inPath);
      fs.unlinkSync(outPath);
      fs.rmdirSync(tmpDir);
    } catch {}
  });


