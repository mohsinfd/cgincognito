/**
 * Clear localStorage and force reprocessing with fixed totals
 * Run this in browser console on /gmail-test page
 */

console.log('🧹 Clearing corrupted statement data...');
localStorage.removeItem('cardgenius_statements');
console.log('✅ Cleared statements from localStorage');
console.log('\n🔄 Please click "Process Statements" button to reprocess with fixed logic');
console.log('\n📊 The new totals will only count DEBIT transactions (actual spending)');
console.log('   - Payments (credits) will NOT be counted');
console.log('   - Refunds (credits) will NOT be counted');

