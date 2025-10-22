// Run this in browser console to check transaction types

const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
const yesStmt = statements.find(s => s.bankCode === 'yes');

if (yesStmt) {
  const txns = yesStmt.content?.content?.transactions || [];
  console.log('YES Bank transactions:');
  txns.forEach((t, i) => {
    console.log(`${i+1}. [${t.type}] ${t.description} - ₹${t.amount}`);
  });
  
  // Check total calculation
  const debitSum = txns.filter(t => t.type === 'Dr' || t.type === 'DR' || t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const creditSum = txns.filter(t => t.type === 'Cr' || t.type === 'CR' || t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  
  console.log(`\nDebits (spending): ₹${debitSum}`);
  console.log(`Credits (payments): ₹${creditSum}`);
  console.log(`Stored total: ₹${yesStmt.totalAmount}`);
  console.log(`\n❌ Problem: If stored total includes credits, that's the bug!`);
}

// Check all statements
console.log('\n\n📊 ALL STATEMENTS:');
statements.forEach(s => {
  const txns = s.content?.content?.transactions || [];
  const debitSum = txns.filter(t => t.type === 'Dr' || t.type === 'DR' || t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
  const creditSum = txns.filter(t => t.type === 'Cr' || t.type === 'CR' || t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  
  console.log(`${s.bankCode.toUpperCase()}: Stored=₹${s.totalAmount.toFixed(2)}, Debits=₹${debitSum.toFixed(2)}, Credits=₹${creditSum.toFixed(2)}`);
  
  if (Math.abs(s.totalAmount - debitSum) > 1) {
    console.log(`  ⚠️ MISMATCH! Stored total doesn't match debits only!`);
  }
});

