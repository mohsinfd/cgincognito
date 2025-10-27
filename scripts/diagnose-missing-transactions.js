/**
 * Diagnose Missing Transactions
 * 
 * Checks why transaction count is low - looks for failed statements, missing months, etc.
 * 
 * Run this from browser console
 */

(function diagnoseMissing() {
  console.log('🔍 Diagnosing Transaction Count...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  console.log(`📊 Total Statements: ${statements.length}`);
  
  // Analyze by bank
  const bankAnalysis = {};
  
  statements.forEach((stmt, idx) => {
    const bank = stmt.bankCode;
    const statementDate = stmt.content?.content?.summary?.statement_date ||
                         stmt.content?.summary?.statement_date ||
                         stmt.statement_date;
    
    if (!bankAnalysis[bank]) {
      bankAnalysis[bank] = {
        statements: [],
        transactions: 0,
        totalAmount: 0,
        dates: []
      };
    }
    
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    const debitTransactions = transactions.filter(t => t.type !== 'Cr' && t.type !== 'credit');
    
    bankAnalysis[bank].statements.push({
      index: idx + 1,
      date: statementDate,
      transactionCount: debitTransactions.length,
      totalAmount: debitTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
    });
    
    bankAnalysis[bank].transactions += debitTransactions.length;
    bankAnalysis[bank].totalAmount += debitTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    bankAnalysis[bank].dates.push(statementDate);
  });
  
  console.log('\n📋 Bank Breakdown:\n');
  Object.entries(bankAnalysis)
    .sort((a, b) => b[1].transactions - a[1].transactions)
    .forEach(([bank, data]) => {
      console.log(`${bank.toUpperCase()}:`);
      console.log(`  Statements: ${data.statements.length}`);
      console.log(`  Transactions: ${data.transactions}`);
      console.log(`  Total Amount: ₹${data.totalAmount.toLocaleString('en-IN')}`);
      console.log(`  Statement Dates: ${data.dates.sort().join(', ')}`);
      console.log('');
    });
  
  // Check for expected banks
  const expectedBanks = ['hdfc', 'yes', 'sbi', 'axis', 'idfc', 'rbl', 'hsbc'];
  const foundBanks = Object.keys(bankAnalysis);
  
  console.log('\n🎯 Bank Coverage:');
  expectedBanks.forEach(bank => {
    const found = foundBanks.includes(bank);
    const data = bankAnalysis[bank];
    console.log(`  ${bank.toUpperCase()}: ${found ? '✓' : '✗'} ${found ? `(${data.statements.length} statements, ${data.transactions} transactions)` : 'NOT FOUND'}`);
  });
  
  // Check for missing months
  console.log('\n📅 Month Coverage:\n');
  Object.entries(bankAnalysis).forEach(([bank, data]) => {
    const months = data.dates.map(d => {
      if (d && d.length === 8) {
        return d.substring(0, 6); // YYYYMM
      }
      return null;
    }).filter(Boolean);
    
    const uniqueMonths = [...new Set(months)].sort();
    
    console.log(`${bank.toUpperCase()}: ${uniqueMonths.length} unique month(s)`);
    console.log(`  Months: ${uniqueMonths.join(', ')}`);
    
    if (uniqueMonths.length < 3) {
      console.log(`  ⚠️ Missing months! Expected 3 months (Aug, Sep, Oct 2025)`);
    }
    console.log('');
  });
  
  // Check for statements with 0 transactions
  console.log('\n⚠️ Statements with Low Transaction Count:\n');
  statements.forEach((stmt, idx) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    const debitCount = transactions.filter(t => t.type !== 'Cr' && t.type !== 'credit').length;
    
    if (debitCount < 5) {
      console.log(`Statement ${idx + 1} (${stmt.bankCode}): ${debitCount} transactions`);
      console.log(`  Date: ${stmt.content?.content?.summary?.statement_date || 'Unknown'}`);
      console.log(`  ID: ${stmt.id || stmt.message_id || 'N/A'}`);
    }
  });
  
  // Calculate expected vs actual
  const expectedStatements = 8 * 3; // 8 cards × 3 months
  const actualStatements = statements.length;
  const missingStatements = expectedStatements - actualStatements;
  
  console.log('\n📊 Expected vs Actual:\n');
  console.log(`Expected Statements: ${expectedStatements} (8 cards × 3 months)`);
  console.log(`Actual Statements: ${actualStatements}`);
  console.log(`Missing Statements: ${missingStatements}`);
  console.log(`Coverage: ${Math.round((actualStatements / expectedStatements) * 100)}%`);
  
  // Estimate transactions
  const avgTransactionsPerStatement = statements.reduce((sum, stmt) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    return sum + transactions.filter(t => t.type !== 'Cr' && t.type !== 'credit').length;
  }, 0) / statements.length;
  
  console.log(`\nAvg Transactions per Statement: ${Math.round(avgTransactionsPerStatement)}`);
  console.log(`Estimated Missing Transactions: ${Math.round(missingStatements * avgTransactionsPerStatement)}`);
  
  return {
    summary: {
      expectedStatements,
      actualStatements,
      missingStatements,
      coverage: Math.round((actualStatements / expectedStatements) * 100)
    },
    bankAnalysis,
    avgTransactionsPerStatement
  };
})();

