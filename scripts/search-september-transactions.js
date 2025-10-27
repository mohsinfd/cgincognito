/**
 * Search September Transactions
 * 
 * Finds all transactions in September 2025
 * 
 * Run this from browser console
 */

(function searchSeptember() {
  console.log('🔍 Searching September 2025 transactions...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  const septemberTransactions = [];
  
  statements.forEach((stmt, stmtIndex) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    const statementDate = stmt.content?.content?.summary?.statement_date ||
                         stmt.content?.summary?.statement_date ||
                         stmt.statement_date;
    
    transactions.forEach((txn) => {
      if (txn.type === 'Cr' || txn.type === 'credit') return;
      
      const txnDate = txn.date;
      if (txnDate && txnDate.startsWith('2025-09')) {
        septemberTransactions.push({
          statement: stmtIndex + 1,
          bank: stmt.bankCode,
          statementDate: statementDate,
          transactionDate: txnDate,
          description: txn.description || txn.raw_desc || 'Unknown',
          amount: Math.abs(txn.amount || 0),
          category: txn.category || 'uncategorized'
        });
      }
    });
  });
  
  console.log(`📊 Found ${septemberTransactions.length} September transactions\n`);
  
  // Sort by amount descending
  septemberTransactions.sort((a, b) => b.amount - a.amount);
  
  console.log('📋 September Transactions (sorted by amount):');
  console.table(septemberTransactions);
  
  // Show largest transactions
  console.log('\n💰 Top 10 Largest September Transactions:');
  septemberTransactions.slice(0, 10).forEach((txn, idx) => {
    console.log(`${idx + 1}. ₹${txn.amount.toLocaleString('en-IN')} - ${txn.description} (${txn.bank})`);
  });
  
  // Check for rent-like amounts
  const rentLike = septemberTransactions.filter(t => t.amount >= 80000 && t.amount <= 95000);
  if (rentLike.length > 0) {
    console.log('\n🏠 September Rent Candidates (₹80k-₹95k):');
    rentLike.forEach(t => {
      console.log(`  - ₹${t.amount.toLocaleString('en-IN')}: ${t.description} (${t.bank})`);
    });
  } else {
    console.log('\n❌ No rent-like transactions found in September (₹80k-₹95k)');
  }
  
  return septemberTransactions;
})();

