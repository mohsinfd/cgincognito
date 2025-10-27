/**
 * Find All Rent Payments
 * 
 * Searches for transactions between ₹80k-₹95k to catch all rent variations
 * 
 * Run this from browser console
 */

(function findAllRent() {
  console.log('🔍 Searching for ALL rent payments (₹80,000 - ₹95,000)...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  const rentCandidates = [];
  const MIN_AMOUNT = 80000;
  const MAX_AMOUNT = 95000;
  
  statements.forEach((stmt, stmtIndex) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    const statementDate = stmt.content?.content?.summary?.statement_date ||
                         stmt.content?.summary?.statement_date ||
                         stmt.statement_date;
    
    transactions.forEach((txn) => {
      if (txn.type === 'Cr' || txn.type === 'credit') return;
      
      const amount = Math.abs(txn.amount || 0);
      
      if (amount >= MIN_AMOUNT && amount <= MAX_AMOUNT) {
        rentCandidates.push({
          statement: stmtIndex + 1,
          bank: stmt.bankCode,
          statementDate: statementDate,
          transactionDate: txn.date,
          description: txn.description || txn.raw_desc || 'Unknown',
          amount: amount,
          category: txn.category || 'uncategorized'
        });
      }
    });
  });
  
  console.log(`📊 Found ${rentCandidates.length} potential rent transactions\n`);
  console.log('📋 All Rent Candidates:');
  console.table(rentCandidates);
  
  if (rentCandidates.length > 0) {
    console.log('\n💰 Summary:');
    console.log(`Total: ₹${rentCandidates.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN')}`);
    
    // Group by month
    const byMonth = {};
    rentCandidates.forEach(txn => {
      const month = txn.transactionDate.substring(0, 7); // YYYY-MM
      if (!byMonth[month]) {
        byMonth[month] = [];
      }
      byMonth[month].push(txn);
    });
    
    console.log('\n📅 By Month:');
    Object.entries(byMonth).sort().forEach(([month, txns]) => {
      const total = txns.reduce((sum, t) => sum + t.amount, 0);
      console.log(`\n${month}: ₹${total.toLocaleString('en-IN')} (${txns.length} transaction${txns.length > 1 ? 's' : ''})`);
      txns.forEach(t => {
        console.log(`  - ${t.description}: ₹${t.amount.toLocaleString('en-IN')} (${t.bank})`);
      });
    });
    
    console.log('\n🔍 Analysis:');
    console.log(`Expected 3 months of rent:`);
    console.log(`  Aug: ~₹85k`);
    console.log(`  Sep: ~₹91k (10% increase)`);
    console.log(`  Oct: ~₹91k`);
    console.log(`\nFound: ${rentCandidates.length} transaction(s)`);
  }
  
  return rentCandidates;
})();

