/**
 * Comprehensive Data Cleanup Script
 * 
 * This script:
 * 1. Removes duplicate statements by message_id
 * 2. Removes statements with 0 debit transactions
 * 3. Fixes statement dates
 * 4. Reports on data quality
 * 
 * Run this from browser console
 */

(function comprehensiveCleanup() {
  console.log('🔧 Starting Comprehensive Data Cleanup...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  console.log(`📊 Starting with ${statements.length} statements\n`);
  
  let duplicatesRemoved = 0;
  let emptyStatementsRemoved = 0;
  let datesFixed = 0;
  
  // Step 1: Remove duplicates by message_id
  const uniqueByMessageId = new Map();
  const duplicateMessageIds = new Set();
  
  statements.forEach((stmt, idx) => {
    const messageId = stmt.message_id || stmt.id;
    
    if (!messageId) {
      console.log(`⚠️ Statement ${idx + 1} has no message_id, keeping it`);
      uniqueByMessageId.set(`no-id-${idx}`, stmt);
      return;
    }
    
    if (uniqueByMessageId.has(messageId)) {
      duplicateMessageIds.add(messageId);
      duplicatesRemoved++;
      console.log(`❌ Removing duplicate: Statement ${idx + 1} (${stmt.bankCode}, message_id: ${messageId})`);
    } else {
      uniqueByMessageId.set(messageId, stmt);
    }
  });
  
  let cleanedStatements = Array.from(uniqueByMessageId.values());
  
  console.log(`\n✅ Step 1 Complete: Removed ${duplicatesRemoved} duplicate statements`);
  console.log(`📊 Remaining: ${cleanedStatements.length} statements\n`);
  
  // Step 2: Remove empty statements (0 debit transactions)
  const nonEmptyStatements = [];
  
  cleanedStatements.forEach((stmt, idx) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    const debitCount = transactions.filter(t => t.type !== 'Cr' && t.type !== 'credit').length;
    
    if (debitCount === 0) {
      emptyStatementsRemoved++;
      console.log(`❌ Removing empty statement: ${stmt.bankCode} (${stmt.content?.content?.summary?.statement_date || 'Unknown'})`);
    } else {
      nonEmptyStatements.push(stmt);
    }
  });
  
  cleanedStatements = nonEmptyStatements;
  
  console.log(`\n✅ Step 2 Complete: Removed ${emptyStatementsRemoved} empty statements`);
  console.log(`📊 Remaining: ${cleanedStatements.length} statements\n`);
  
  // Step 3: Fix statement dates
  cleanedStatements.forEach((stmt, idx) => {
    const content = stmt.content?.content || stmt.content;
    if (!content) return;
    
    const currentDate = content.summary?.statement_date || content.statement_date;
    
    // If date is today's date or future, try to fix it
    if (currentDate && currentDate.startsWith('202510')) {
      const transactions = content.transactions || [];
      
      if (transactions.length > 0) {
        const oldestTxn = transactions[0];
        const txnDate = oldestTxn.date;
        
        if (txnDate && txnDate.length === 10) {
          const fixedDate = txnDate.replace(/-/g, '');
          
          if (content.summary) {
            content.summary.statement_date = fixedDate;
          } else {
            content.statement_date = fixedDate;
          }
          
          datesFixed++;
        }
      }
    }
  });
  
  console.log(`\n✅ Step 3 Complete: Fixed ${datesFixed} statement dates`);
  
  // Step 4: Analyze final data
  console.log(`\n📊 Final Data Analysis:\n`);
  
  const bankCounts = {};
  let totalTransactions = 0;
  let totalAmount = 0;
  
  cleanedStatements.forEach(stmt => {
    const bank = stmt.bankCode;
    if (!bankCounts[bank]) {
      bankCounts[bank] = { statements: 0, transactions: 0, amount: 0 };
    }
    
    bankCounts[bank].statements++;
    
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    const debits = transactions.filter(t => t.type !== 'Cr' && t.type !== 'credit');
    bankCounts[bank].transactions += debits.length;
    
    const bankAmount = debits.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    bankCounts[bank].amount += bankAmount;
    
    totalTransactions += debits.length;
    totalAmount += bankAmount;
  });
  
  console.log('Bank Breakdown:');
  Object.entries(bankCounts)
    .sort((a, b) => b[1].transactions - a[1].transactions)
    .forEach(([bank, data]) => {
      console.log(`  ${bank.toUpperCase()}: ${data.statements} statements, ${data.transactions} transactions, ₹${data.amount.toLocaleString('en-IN')}`);
    });
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total Statements: ${cleanedStatements.length}`);
  console.log(`  Total Transactions: ${totalTransactions}`);
  console.log(`  Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`);
  console.log(`  Avg Transactions per Statement: ${Math.round(totalTransactions / cleanedStatements.length)}`);
  
  // Save cleaned data
  if (duplicatesRemoved > 0 || emptyStatementsRemoved > 0 || datesFixed > 0) {
    localStorage.setItem('cardgenius_statements', JSON.stringify(cleanedStatements));
    console.log(`\n✅ Cleaned data saved to localStorage`);
    console.log(`\n🎉 Cleanup complete! Please refresh the dashboard.`);
  } else {
    console.log(`\n✓ No cleanup needed`);
  }
  
  return {
    removed: {
      duplicates: duplicatesRemoved,
      empty: emptyStatementsRemoved,
      datesFixed: datesFixed
    },
    final: {
      statements: cleanedStatements.length,
      transactions: totalTransactions,
      amount: totalAmount
    },
    bankCounts
  };
})();

