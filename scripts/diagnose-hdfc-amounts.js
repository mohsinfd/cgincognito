// Diagnose HDFC amount parsing issue
// Run in browser console

const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
const hdfcBig = statements.find(s => s.bankCode === 'hdfc' && s.totalAmount > 1000000);

if (hdfcBig) {
  console.log('🔍 HDFC Statement Analysis\n');
  console.log('Statement ID:', hdfcBig.id);
  console.log('Stored Total:', hdfcBig.totalAmount);
  console.log('Transaction Count:', hdfcBig.transactionCount);
  
  const txns = hdfcBig.content?.content?.transactions || [];
  
  console.log('\n📊 ALL TRANSACTIONS (with type details):\n');
  txns.forEach((t, i) => {
    console.log(`${i+1}. ${t.description}`);
    console.log(`   Type: "${t.type}" (lowercase: "${(t.type || '').toLowerCase()}")`);
    console.log(`   Amount: ${t.amount} (type: ${typeof t.amount})`);
    console.log(`   Raw: ${JSON.stringify(t)}\n`);
  });
  
  // Calculate what should be included
  let calculatedTotal = 0;
  let includedCount = 0;
  let excludedCount = 0;
  
  console.log('💰 CALCULATION CHECK:\n');
  txns.forEach((t, i) => {
    const typeStr = (t.type || '').toString().toLowerCase();
    const isCredit = typeStr === 'cr' || typeStr === 'credit' || typeStr.includes('credit') || typeStr.includes('payment');
    
    if (isCredit) {
      console.log(`${i+1}. EXCLUDED (credit): ${t.description} - ₹${t.amount}`);
      excludedCount++;
    } else {
      console.log(`${i+1}. INCLUDED (debit): ${t.description} - ₹${t.amount}`);
      calculatedTotal += Math.abs(t.amount || 0);
      includedCount++;
    }
  });
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`Included: ${includedCount} transactions = ₹${calculatedTotal.toLocaleString()}`);
  console.log(`Excluded: ${excludedCount} transactions`);
  console.log(`Stored Total: ₹${hdfcBig.totalAmount.toLocaleString()}`);
  console.log(`Match: ${Math.abs(calculatedTotal - hdfcBig.totalAmount) < 1 ? '✅' : '❌'}`);
  
  // Check if amounts look like they're in wrong units
  const suspicious = txns.filter(t => t.amount > 100000);
  if (suspicious.length > 0) {
    console.log(`\n⚠️  SUSPICIOUS LARGE AMOUNTS:`);
    suspicious.forEach(t => {
      console.log(`   ${t.description}: ₹${t.amount.toLocaleString()}`);
      console.log(`   Could be: ₹${(t.amount / 100).toFixed(2)} (divided by 100)?`);
      console.log(`   Could be: ₹${(t.amount / 1000).toFixed(2)} (divided by 1000)?\n`);
    });
  }
}

