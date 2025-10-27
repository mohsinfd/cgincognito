/**
 * Debug SBI Statements
 * 
 * Check why SBI has 0 transactions
 * 
 * Run this from browser console
 */

(function debugSBI() {
  console.log('🔍 Debugging SBI Statements...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  const sbiStatements = statements.filter(s => s.bankCode === 'sbi');
  
  console.log(`Found ${sbiStatements.length} SBI statements\n`);
  
  sbiStatements.forEach((stmt, idx) => {
    console.log(`\nStatement ${idx + 1}:`);
    console.log(`  ID: ${stmt.id || stmt.message_id || 'N/A'}`);
    console.log(`  Date: ${stmt.content?.content?.summary?.statement_date || stmt.content?.summary?.statement_date || 'Unknown'}`);
    console.log(`  Has Content: ${!!stmt.content}`);
    console.log(`  Has Nested Content: ${!!stmt.content?.content}`);
    
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    console.log(`  Transactions Array: ${Array.isArray(transactions) ? transactions.length : 'Not an array'}`);
    
    if (transactions && transactions.length > 0) {
      console.log(`  First Transaction:`, transactions[0]);
    } else {
      console.log(`  Content Structure:`, JSON.stringify(stmt.content, null, 2).substring(0, 500));
    }
  });
  
  return sbiStatements;
})();

