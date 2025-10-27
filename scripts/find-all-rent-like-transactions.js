/**
 * Find All Rent-Like Transactions
 * 
 * Searches for transactions that might be rent payments but weren't categorized correctly
 * 
 * Run this from browser console
 */

(function findRentLike() {
  console.log('🔍 Searching for ALL rent-like transactions...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  const allRentLike = [];
  
  statements.forEach((stmt, stmtIndex) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    const statementDate = stmt.content?.content?.summary?.statement_date ||
                         stmt.content?.summary?.statement_date ||
                         stmt.statement_date;
    
    transactions.forEach((txn) => {
      if (txn.type === 'Cr' || txn.type === 'credit') return;
      
      const desc = (txn.description || txn.raw_desc || '').toLowerCase();
      const amount = Math.abs(txn.amount || 0);
      
      // Check for rent-related keywords
      const isRentLike = desc.includes('rent') || 
                        desc.includes('cred') || 
                        desc.includes('dreamplug') ||
                        desc.includes('nobroker') ||
                        desc.includes('housing') ||
                        desc.includes('mygate') ||
                        desc.includes('maintenance');
      
      if (isRentLike) {
        allRentLike.push({
          statement: stmtIndex + 1,
          bank: stmt.bankCode,
          date: statementDate,
          transactionDate: txn.date,
          description: txn.description || txn.raw_desc || 'Unknown',
          amount: amount,
          category: txn.category || 'uncategorized',
          type: txn.type
        });
      }
    });
  });
  
  console.log(`📊 Found ${allRentLike.length} rent-like transactions\n`);
  console.log('📋 All Rent-Like Transactions:');
  console.table(allRentLike);
  
  // Group by description to find patterns
  const byDescription = {};
  allRentLike.forEach(txn => {
    const key = txn.description.toLowerCase();
    if (!byDescription[key]) {
      byDescription[key] = [];
    }
    byDescription[key].push(txn);
  });
  
  console.log('\n📊 Grouped by Description:');
  Object.entries(byDescription).forEach(([desc, txns]) => {
    const total = txns.reduce((sum, t) => sum + t.amount, 0);
    console.log(`\n${desc}:`);
    console.log(`  Total: ₹${total.toLocaleString('en-IN')}`);
    console.log(`  Count: ${txns.length}`);
    txns.forEach(t => {
      console.log(`    - ₹${t.amount.toLocaleString('en-IN')} on ${t.transactionDate} (${t.bank})`);
    });
  });
  
  return allRentLike;
})();

