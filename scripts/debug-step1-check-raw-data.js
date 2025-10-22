// STEP 1: Check what's actually stored in localStorage
// Run this in browser console

console.log('═══════════════════════════════════════════════════════════');
console.log('STEP 1: CHECKING RAW LOCALSTORAGE DATA');
console.log('═══════════════════════════════════════════════════════════\n');

const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');

console.log(`📊 Total statements: ${statements.length}`);
console.log(`📅 Last sync: ${new Date(statements[0]?.uploadedAt).toLocaleString()}\n`);

// Check each statement
let totalStoredAmount = 0;
let totalActualDebits = 0;
let totalCredits = 0;

statements.forEach((stmt, index) => {
  const txns = stmt.content?.content?.transactions || [];
  
  // Calculate what's STORED
  const storedTotal = stmt.totalAmount || 0;
  totalStoredAmount += storedTotal;
  
  // Calculate what SHOULD BE (debits only)
  let debitSum = 0;
  let creditSum = 0;
  
  txns.forEach(t => {
    const type = (t.type || '').toLowerCase();
    if (type === 'cr' || type === 'credit') {
      creditSum += t.amount;
    } else if (type === 'dr' || type === 'debit') {
      debitSum += t.amount;
    }
  });
  
  totalActualDebits += debitSum;
  totalCredits += creditSum;
  
  const isCorrect = Math.abs(storedTotal - debitSum) < 1;
  
  console.log(`${isCorrect ? '✅' : '❌'} Statement ${index + 1} (${stmt.bankCode.toUpperCase()})`);
  console.log(`   Stored Total: ₹${storedTotal.toFixed(0)}`);
  console.log(`   Actual Debits: ₹${debitSum.toFixed(0)}`);
  console.log(`   Credits: ₹${creditSum.toFixed(0)}`);
  console.log(`   Transactions: ${txns.length} (${txns.filter(t => (t.type||'').toLowerCase() === 'dr' || (t.type||'').toLowerCase() === 'debit').length} debits, ${txns.filter(t => (t.type||'').toLowerCase() === 'cr' || (t.type||'').toLowerCase() === 'credit').length} credits)`);
  
  if (!isCorrect) {
    console.log(`   ⚠️  MISMATCH: Off by ₹${(storedTotal - debitSum).toFixed(0)}`);
    
    // Show first few transactions to debug
    console.log('   First 3 transactions:');
    txns.slice(0, 3).forEach((t, i) => {
      console.log(`     ${i+1}. [${t.type}] ${t.description} - ₹${t.amount}`);
    });
  }
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════');
console.log('SUMMARY:');
console.log(`Total STORED in localStorage: ₹${totalStoredAmount.toLocaleString()}`);
console.log(`Total ACTUAL debits: ₹${totalActualDebits.toLocaleString()}`);
console.log(`Total credits (should be excluded): ₹${totalCredits.toLocaleString()}`);
console.log('═══════════════════════════════════════════════════════════\n');

if (Math.abs(totalStoredAmount - totalActualDebits) > 100) {
  console.error('❌ PROBLEM: Stored totals DO NOT match actual debits!');
  console.error('   This means the save logic (gmail-test/page.tsx) is STILL BUGGY!');
} else {
  console.log('✅ Stored totals are CORRECT (debits only)');
  console.log('   Problem must be in the DISPLAY logic (dashboard components)');
}

// Export for next step
window.debugData = {
  statements,
  totalStoredAmount,
  totalActualDebits,
  totalCredits
};

console.log('\n✅ Debug data saved to window.debugData');
console.log('   Run debug-step2 script next...');

