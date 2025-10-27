/**
 * Find Rent Transactions by Amount
 * 
 * Searches for transactions around ₹85,739 (±₹2000 for convenience fees)
 * 
 * Run this from browser console
 */

(function findRentByAmount() {
  console.log('🔍 Searching for rent transactions by amount (₹85,739 ± ₹2,000)...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  const rentCandidates = [];
  const RENT_AMOUNT = 85739;
  const TOLERANCE = 2000; // ±₹2000 for convenience fees
  
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
      
      // Check if amount is close to rent amount
      if (amount >= (RENT_AMOUNT - TOLERANCE) && amount <= (RENT_AMOUNT + TOLERANCE)) {
        rentCandidates.push({
          statement: stmtIndex + 1,
          bank: stmt.bankCode,
          statementDate: statementDate,
          transactionDate: txn.date,
          description: txn.description || txn.raw_desc || 'Unknown',
          amount: amount,
          category: txn.category || 'uncategorized',
          difference: Math.abs(amount - RENT_AMOUNT)
        });
      }
    });
  });
  
  console.log(`📊 Found ${rentCandidates.length} potential rent transactions\n`);
  console.log('📋 Rent Amount Candidates:');
  console.table(rentCandidates);
  
  if (rentCandidates.length > 0) {
    console.log('\n💰 Summary:');
    console.log(`Total found: ₹${rentCandidates.reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-IN')}`);
    console.log(`Expected (3 months): ₹${(RENT_AMOUNT * 3).toLocaleString('en-IN')}`);
    
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
    Object.entries(byMonth).forEach(([month, txns]) => {
      const total = txns.reduce((sum, t) => sum + t.amount, 0);
      console.log(`\n${month}: ₹${total.toLocaleString('en-IN')} (${txns.length} transaction${txns.length > 1 ? 's' : ''})`);
      txns.forEach(t => {
        console.log(`  - ${t.description}: ₹${t.amount.toLocaleString('en-IN')} (${t.bank})`);
      });
    });
  }
  
  return rentCandidates;
})();

