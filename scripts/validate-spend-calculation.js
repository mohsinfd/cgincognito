/**
 * Validate Spend Calculation
 * Run this in browser console to check for inconsistencies
 * 
 * Usage: Copy this entire script and paste in browser console
 */

console.log('🔍 Validating Spend Calculation...\n');

// Load statements
const statementsJson = localStorage.getItem('cardgenius_statements');
if (!statementsJson) {
  console.error('❌ No statements found in localStorage');
} else {
  const statements = JSON.parse(statementsJson);
  console.log(`📊 Found ${statements.length} statements\n`);
  
  // Deduplicate by ID
  const uniqueStatements = Array.from(
    new Map(statements.map(stmt => [stmt.id, stmt])).values()
  );
  
  if (uniqueStatements.length !== statements.length) {
    console.warn(`⚠️ Found ${statements.length - uniqueStatements.length} duplicate statements`);
  }
  
  // Track transactions
  const seenTransactionIds = new Set();
  const allTransactions = [];
  let totalDebit = 0;
  let totalCredit = 0;
  let duplicateCount = 0;
  
  uniqueStatements.forEach((stmt, idx) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || 
                        [];
    
    transactions.forEach(txn => {
      const txnId = `${stmt.id}_${txn.description || ''}_${txn.amount}_${txn.date || ''}`;
      
      if (seenTransactionIds.has(txnId)) {
        duplicateCount++;
        return;
      }
      seenTransactionIds.add(txnId);
      
      const typeStr = (txn.type || '').toString().toLowerCase();
      const isCredit = typeStr === 'cr' || typeStr === 'credit';
      const amount = Math.abs(txn.amount || 0);
      
      if (isCredit) {
        totalCredit += amount;
      } else {
        totalDebit += amount;
      }
      
      allTransactions.push(txn);
    });
  });
  
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 VALIDATION RESULTS');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Statements: ${statements.length} total, ${uniqueStatements.length} unique`);
  console.log(`Transactions: ${allTransactions.length} unique`);
  console.log(`Duplicates skipped: ${duplicateCount}`);
  console.log(`\n💰 SPEND BREAKDOWN:`);
  console.log(`   Debits (spending): ₹${totalDebit.toLocaleString('en-IN')}`);
  console.log(`   Credits (payments): ₹${totalCredit.toLocaleString('en-IN')}`);
  console.log(`   Net (Debits - Credits): ₹${(totalDebit - totalCredit).toLocaleString('en-IN')}`);
  console.log('\n═══════════════════════════════════════════════════');
  
  // Show breakdown by statement
  console.log('\n📄 BY STATEMENT:');
  uniqueStatements.forEach((stmt, idx) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || 
                        [];
    
    let stmtDebit = 0;
    let stmtCredit = 0;
    
    transactions.forEach(txn => {
      const typeStr = (txn.type || '').toString().toLowerCase();
      const isCredit = typeStr === 'cr' || typeStr === 'credit';
      const amount = Math.abs(txn.amount || 0);
      
      if (isCredit) {
        stmtCredit += amount;
      } else {
        stmtDebit += amount;
      }
    });
    
    console.log(`${idx + 1}. ${stmt.bankCode?.toUpperCase()} (${stmt.id}):`);
    console.log(`   Debit: ₹${stmtDebit.toLocaleString('en-IN')}, Credit: ₹${stmtCredit.toLocaleString('en-IN')}`);
    console.log(`   Transactions: ${transactions.length}`);
  });
  
  // Store results for comparison
  window.spendValidation = {
    totalDebit,
    totalCredit,
    netSpend: totalDebit - totalCredit,
    transactionCount: allTransactions.length,
    statementCount: uniqueStatements.length,
    duplicateCount,
    // Expected optimizer total (debits only, excluding credits)
    expectedOptimizerTotal: totalDebit
  };
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📈 EXPECTED VALUES:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Optimizer should use: ₹${totalDebit.toLocaleString('en-IN')} (debits only)`);
  console.log(`NOT: ₹${(totalDebit + totalCredit).toLocaleString('en-IN')} (debits + credits)`);
  console.log(`NOT: ₹${(totalDebit - totalCredit).toLocaleString('en-IN')} (net)`);
  console.log('\n✅ Validation complete! Results stored in window.spendValidation');
}
