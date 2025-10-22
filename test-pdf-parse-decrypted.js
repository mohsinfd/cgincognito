const fs = require('fs');
const pdfParse = require('pdf-parse');

console.log('🧪 Testing pdf-parse on decrypted PDF');
console.log('='.repeat(80));

const decryptedFile = 'decrypted-output.pdf';

if (!fs.existsSync(decryptedFile)) {
  console.error('❌ decrypted-output.pdf not found');
  console.log('Please run: node test-qpdf-decrypt.js 20251008.pdf first');
  process.exit(1);
}

const pdfBuffer = fs.readFileSync(decryptedFile);
console.log('📄 Decrypted PDF size:', pdfBuffer.length, 'bytes');

console.log('\n🔄 Running pdf-parse...\n');

pdfParse(pdfBuffer)
  .then(data => {
    console.log('✅ SUCCESS! pdf-parse worked on decrypted PDF');
    console.log('='.repeat(80));
    console.log('📊 Results:');
    console.log('  Pages:', data.numpages);
    console.log('  Text length:', data.text.length, 'characters');
    console.log('  Author:', data.info?.Author || 'N/A');
    console.log('  Title:', data.info?.Title || 'N/A');
    console.log('\n📄 First 500 characters of extracted text:');
    console.log('-'.repeat(80));
    console.log(data.text.substring(0, 500));
    console.log('-'.repeat(80));
    console.log('\n✅ pdf-parse can successfully extract text from decrypted PDF!');
  })
  .catch(err => {
    console.error('❌ FAILED! pdf-parse error:', err.message);
    console.error('Stack:', err.stack);
    console.log('\n⚠️ pdf-parse cannot handle this decrypted PDF');
  });


