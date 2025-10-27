/**
 * Debug Rent Transactions Script
 * 
 * Shows all transactions categorized as "rent" with their amounts
 * 
 * Run this from browser console:
 * 1. Open DevTools (F12)
 * 2. Copy this entire file content
 * 3. Paste in Console and press Enter
 */

(function debugRent() {
  console.log('🔍 Debugging Rent Transactions...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  let totalRent = 0;
  const rentTransactions = [];
  
  statements.forEach((stmt, stmtIndex) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    transactions.forEach((txn, txnIndex) => {
      // Skip credits
      if (txn.type === 'Cr' || txn.type === 'credit') return;
      
      const category = txn.category || 'other_offline_spends';
      
      if (category === 'rent') {
        const amount = Math.abs(txn.amount || 0);
        totalRent += amount;
        
        rentTransactions.push({
          statement: stmtIndex + 1,
          bank: stmt.bankCode,
          description: txn.description || txn.raw_desc || 'Unknown',
          amount: amount,
          date: txn.date,
          category: category
        });
      }
    });
  });
  
  console.log(`📊 Found ${rentTransactions.length} rent transactions totaling ₹${totalRent.toLocaleString('en-IN')}\n`);
  
  console.log('📋 Rent Transactions Detail:');
  console.table(rentTransactions);
  
  console.log('\n💡 Note: CRED/Dreamplug transactions are currently categorized as "rent"');
  console.log('   This includes rent, maintenance, education fees, etc.');
  
  return {
    totalRent,
    transactionCount: rentTransactions.length,
    transactions: rentTransactions
  };
})();

