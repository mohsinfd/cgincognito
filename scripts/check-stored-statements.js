#!/usr/bin/env node

/**
 * Check stored statements in browser localStorage
 * Usage: Open browser console and run this script
 */

function checkStoredStatements() {
  console.log('🔍 Checking stored statements...');
  
  try {
    // Get stored statements
    const stored = localStorage.getItem('cardgenius_statements');
    
    if (!stored) {
      console.log('❌ No statements found in localStorage');
      console.log('💡 This means either:');
      console.log('   1. No statements have been processed yet');
      console.log('   2. The saveStatement() function was not called');
      console.log('   3. There was an error during processing');
      return;
    }
    
    const statements = JSON.parse(stored);
    console.log(`✅ Found ${statements.length} stored statements:`);
    
    statements.forEach((stmt, index) => {
      console.log(`\n📄 Statement ${index + 1}:`);
      console.log(`   ID: ${stmt.id}`);
      console.log(`   Bank: ${stmt.bankCode?.toUpperCase()}`);
      console.log(`   Card: •••• ${stmt.cardLast4 || 'N/A'}`);
      console.log(`   Transactions: ${stmt.transactionCount || 'N/A'}`);
      console.log(`   Total Amount: ₹${stmt.totalAmount?.toLocaleString() || 'N/A'}`);
      console.log(`   Uploaded: ${new Date(stmt.uploadedAt).toLocaleString()}`);
      
      // Check if content exists
      if (stmt.content) {
        console.log(`   ✅ Content data exists`);
        if (stmt.content.transactions) {
          console.log(`   📊 Transactions: ${stmt.content.transactions.length}`);
        }
        if (stmt.content.summary) {
          console.log(`   📈 Summary data exists`);
        }
      } else {
        console.log(`   ❌ No content data`);
      }
    });
    
    // Check storage usage
    const storageSize = new Blob([stored]).size;
    console.log(`\n💾 Storage Info:`);
    console.log(`   Size: ${(storageSize / 1024).toFixed(2)} KB`);
    console.log(`   Max statements: 10`);
    
  } catch (error) {
    console.error('❌ Error checking statements:', error);
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  checkStoredStatements();
} else {
  console.log('Run this script in your browser console (F12 → Console)');
}

// Export for manual use
if (typeof module !== 'undefined') {
  module.exports = { checkStoredStatements };
}

