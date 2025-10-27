/**
 * Check SBI Debit Transactions
 * 
 * Find all transactions (including credits) in SBI statements
 * 
 * Run this from browser console
 */

(function checkSBIDebits() {
  console.log('🔍 Checking ALL SBI Transactions (including credits)...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  const sbiStatements = statements.filter(s => s.bankCode === 'sbi');
  
  sbiStatements.forEach((stmt, idx) => {
    console.log(`\nStatement ${idx + 1} (${stmt.content?.content?.summary?.statement_date || 'Unknown'}):`);
    
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    console.log(`Total Transactions: ${transactions.length}`);
    
    transactions.forEach((txn, txnIdx) => {
      console.log(`  ${txnIdx + 1}. [${txn.type}] ${txn.date}: ${txn.description} - ₹${txn.amount}`);
    });
    
    const debits = transactions.filter(t => t.type === 'Dr' || t.type === 'Debit');
    const credits = transactions.filter(t => t.type === 'Cr' || t.type === 'Credit');
    
    console.log(`\nSummary:`);
    console.log(`  Debits: ${debits.length}`);
    console.log(`  Credits: ${credits.length}`);
    
    if (debits.length === 0) {
      console.log(`  ⚠️ NO DEBIT TRANSACTIONS FOUND!`);
      console.log(`  This could mean:`);
      console.log(`    1. LLM failed to extract them`);
      console.log(`    2. PDF parsing failed`);
      console.log(`    3. Statement was empty/minimal`);
    }
  });
  
  const allDebits = sbiStatements.reduce((acc, stmt) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    return acc + transactions.filter(t => t.type === 'Dr' || t.type === 'Debit').length;
  }, 0);
  
  console.log(`\n📊 Total SBI Debit Transactions: ${allDebits}`);
  
  return {
    totalDebits: allDebits,
    statements: sbiStatements.map(stmt => ({
      date: stmt.content?.content?.summary?.statement_date || stmt.content?.summary?.statement_date,
      totalTransactions: (stmt.content?.content?.transactions || stmt.content?.transactions || stmt.transactions || []).length,
      debits: (stmt.content?.content?.transactions || stmt.content?.transactions || stmt.transactions || []).filter(t => t.type === 'Dr' || t.type === 'Debit').length,
      credits: (stmt.content?.content?.transactions || stmt.content?.transactions || stmt.transactions || []).filter(t => t.type === 'Cr' || t.type === 'Credit').length
    }))
  };
})();

