/**
 * Clear localStorage and Re-process Statements
 * Faster than full sync since PDFs are already downloaded
 */

console.log('🔄 Clear localStorage and Re-process');
console.log('====================================');

// Clear existing statements
localStorage.removeItem('cardgenius_statements');
console.log('✅ Cleared localStorage');

// Instructions for re-processing
console.log('\n📋 Next Steps:');
console.log('1. Go to Gmail Test page');
console.log('2. Click "Process Statements" (this will use existing PDFs)');
console.log('3. Processing should be faster since PDFs are already downloaded');
console.log('4. Check dashboard for improved categorization');

console.log('\n⏱️ Expected Time: 5-10 minutes (vs 15 minutes for full sync)');
console.log('💡 This skips Gmail sync and PDF download, only does decryption + parsing');
