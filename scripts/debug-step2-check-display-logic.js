// STEP 2: Simulate the dashboard display logic
// Run this AFTER step 1

console.log('═══════════════════════════════════════════════════════════');
console.log('STEP 2: SIMULATING DASHBOARD DISPLAY LOGIC');
console.log('═══════════════════════════════════════════════════════════\n');

if (!window.debugData) {
  console.error('❌ Run debug-step1 script first!');
} else {
  const statements = window.debugData.statements;
  
  // Simulate what monthly-spend-summary.tsx does
  let displayTotal = 0;
  
  console.log('Simulating dashboard calculation logic:\n');
  
  statements.forEach((stmt, index) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || 
                        [];
    
    console.log(`Statement ${index + 1} (${stmt.bankCode.toUpperCase()}):`);
    console.log(`  Total transactions: ${transactions.length}`);
    
    let stmtTotal = 0;
    let includedCount = 0;
    let excludedCount = 0;
    
    transactions.forEach((txn, i) => {
      // THIS IS THE LOGIC FROM monthly-spend-summary.tsx
      const typeStr = (txn.type || '').toString().toLowerCase();
      const isCredit = typeStr === 'cr' || typeStr === 'credit' || typeStr.includes('credit') || typeStr.includes('payment');
      const isDebit = !isCredit && (
        typeStr === 'dr' || 
        typeStr === 'debit' || 
        typeStr.includes('debit') ||
        txn.amount > 0
      );
      
      if (isDebit) {
        stmtTotal += Math.abs(txn.amount || 0);
        includedCount++;
        
        if (i < 3) {
          console.log(`    ✅ [${txn.type}] ${txn.description} - ₹${txn.amount} (INCLUDED)`);
        }
      } else {
        excludedCount++;
        
        if (i < 3) {
          console.log(`    ⛔ [${txn.type}] ${txn.description} - ₹${txn.amount} (EXCLUDED)`);
        }
      }
    });
    
    displayTotal += stmtTotal;
    console.log(`  Included: ${includedCount}, Excluded: ${excludedCount}`);
    console.log(`  Statement display total: ₹${stmtTotal.toLocaleString()}\n`);
  });
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('DISPLAY CALCULATION RESULT:');
  console.log(`Dashboard would show: ₹${displayTotal.toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Compare with stored
  console.log('COMPARISON:');
  console.log(`Stored in localStorage: ₹${window.debugData.totalStoredAmount.toLocaleString()}`);
  console.log(`Calculated by dashboard: ₹${displayTotal.toLocaleString()}`);
  console.log(`Actual debits only: ₹${window.debugData.totalActualDebits.toLocaleString()}\n`);
  
  if (Math.abs(displayTotal - window.debugData.totalActualDebits) > 100) {
    console.error('❌ PROBLEM: Dashboard calculation is WRONG!');
    console.error('   The display logic in monthly-spend-summary.tsx is buggy!');
    
    // Find where the issue is
    console.log('\n🔍 DEBUGGING:');
    statements.forEach((stmt, index) => {
      const transactions = stmt.content?.content?.transactions || [];
      
      // Find problematic transactions
      const problems = [];
      transactions.forEach((txn) => {
        const typeStr = (txn.type || '').toString().toLowerCase();
        const isCredit = typeStr === 'cr' || typeStr === 'credit' || typeStr.includes('credit') || typeStr.includes('payment');
        const isDebit = !isCredit && (
          typeStr === 'dr' || 
          typeStr === 'debit' || 
          typeStr.includes('debit') ||
          txn.amount > 0
        );
        
        // Check if a credit is being counted as debit
        const actuallyCredit = typeStr === 'cr' || typeStr === 'credit';
        if (actuallyCredit && isDebit) {
          problems.push({
            description: txn.description,
            type: txn.type,
            amount: txn.amount,
            reason: 'Credit being counted as debit!'
          });
        }
      });
      
      if (problems.length > 0) {
        console.log(`\n❌ Statement ${index + 1} (${stmt.bankCode.toUpperCase()}) has ${problems.length} problems:`);
        problems.forEach(p => {
          console.log(`   - [${p.type}] ${p.description} - ₹${p.amount}`);
          console.log(`     Reason: ${p.reason}`);
        });
      }
    });
  } else {
    console.log('✅ Dashboard calculation is CORRECT!');
  }
}

