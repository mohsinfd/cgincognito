#!/usr/bin/env node

/**
 * Download PDFs from Gmail for Testing
 * Downloads all statement PDFs to local directory for testing
 * Usage: node scripts/download-pdfs.js
 */

const fs = require('fs');
const path = require('path');

// Mock statement data from your Gmail sync
const STATEMENTS = [
  { bank: 'hsbc', filename: '20251008.pdf', messageId: 'hsbc-msg-1' },
  { bank: 'hdfc', filename: '5522XXXXXXXXXX59_14-10-2025_588.pdf', messageId: 'hdfc-msg-1' },
  { bank: 'axis', filename: 'Credit Card Statement.pdf', messageId: 'axis-msg-1' },
  { bank: 'rbl', filename: 'xxxx-xxxx-xx-xxxx01_105603042_22-09-2025.pdf', messageId: 'rbl-msg-1' },
  { bank: 'idfc', filename: '40000001396045_21092025_192214583.pdf', messageId: 'idfc-msg-1' },
  { bank: 'sbi', filename: '8796326479959131_17092025.pdf', messageId: 'sbi-msg-1' },
  { bank: 'yes', filename: '122009_1005060000047727-691.pdf', messageId: 'yes-msg-1' },
];

async function downloadPDFs() {
  console.log('📥 Downloading PDFs from Gmail...');
  console.log('=====================================');
  
  const downloadDir = path.join(process.cwd(), 'downloaded-pdfs');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const statement of STATEMENTS) {
    console.log(`\n🔄 Downloading ${statement.bank.toUpperCase()}: ${statement.filename}`);
    
    try {
      // This would normally call the Gmail API to download the PDF
      // For now, we'll create a placeholder file
      const filePath = path.join(downloadDir, statement.filename);
      
      // Create a placeholder file (replace this with actual Gmail download)
      fs.writeFileSync(filePath, `Placeholder PDF for ${statement.bank} - ${statement.filename}`);
      
      console.log(`✅ Downloaded: ${filePath}`);
      successCount++;
      
    } catch (error) {
      console.log(`❌ Failed to download ${statement.filename}: ${error.message}`);
      failureCount++;
    }
  }
  
  console.log('\n📊 Download Results');
  console.log('==================');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📁 Files saved to: ${downloadDir}`);
  
  if (successCount > 0) {
    console.log('\n🧪 Next steps:');
    console.log('1. Replace placeholder files with actual PDFs from Gmail');
    console.log('2. Run: node scripts/test-single-pdf.js <pdf-file>');
    console.log('3. Or run: node scripts/bulk-process-statements.js');
  }
}

if (require.main === module) {
  downloadPDFs().catch(console.error);
}

