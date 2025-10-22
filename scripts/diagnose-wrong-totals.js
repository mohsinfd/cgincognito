/**
 * Diagnose why dashboard totals are wrong
 * Run this in browser console
 */

console.log('🔍 Diagnosing Dashboard Data Issues');
console.log('='.repeat(80));

// Load statements from localStorage
const statementsJson = localStorage.getItem('cardgenius_statements');
if (!statementsJson) {
  console.log('❌ No statements found in localStorage');
} else {
  const statements = JSON.parse(statementsJson);
  console.log(`\n📊 Found ${statements.length} statements in localStorage\n`);

  // Analyze each statement
  statements.forEach((stmt, index) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Statement ${index + 1}: ${stmt.bankCode?.toUpperCase()} (${stmt.id})`);
    console.log(`${'='.repeat(80)}`);
    
    // Get transactions from various possible paths
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || 
                        [];
    
    console.log(`📄 Total Transactions: ${transactions.length}`);
    console.log(`💰 Stored Total Amount: ₹${stmt.totalAmount?.toLocaleString('en-IN') || 'N/A'}`);
    
    // Calculate actual total from transactions
    let calculatedTotal = 0;
    let debitCount = 0;
    let creditCount = 0;
    
    transactions.forEach(txn => {
      const amount = parseFloat(txn.amount || 0);
      const type = txn.type?.toString().toUpperCase();
      
      // Only count debits (actual spending)
      if (type === 'DR' || type === 'DEBIT' || (!type && amount > 0)) {
        calculatedTotal += amount;
        debitCount++;
      } else if (type === 'CR' || type === 'CREDIT') {
        creditCount++;
      }
    });
    
    console.log(`📊 Calculated from transactions:`);
    console.log(`   - Debits: ${debitCount} transactions = ₹${calculatedTotal.toLocaleString('en-IN')}`);
    console.log(`   - Credits: ${creditCount} transactions`);
    console.log(`   - Match: ${Math.abs(calculatedTotal - (stmt.totalAmount || 0)) < 1 ? '✅' : '❌ MISMATCH!'}`);
    
    if (Math.abs(calculatedTotal - (stmt.totalAmount || 0)) > 1) {
      console.log(`   ⚠️ DIFFERENCE: ₹${Math.abs(calculatedTotal - (stmt.totalAmount || 0)).toLocaleString('en-IN')}`);
    }
    
    // Show some sample transactions
    console.log(`\n📝 Sample Transactions (first 5 debits):`);
    transactions
      .filter(txn => {
        const type = txn.type?.toString().toUpperCase();
        return type === 'DR' || type === 'DEBIT' || (!type && txn.amount > 0);
      })
      .slice(0, 5)
      .forEach((txn, i) => {
        console.log(`   ${i + 1}. ${txn.description || txn.merchant || 'Unknown'}`);
        console.log(`      Amount: ₹${parseFloat(txn.amount || 0).toLocaleString('en-IN')}`);
        console.log(`      Type: ${txn.type || 'N/A'}`);
        console.log(`      Category: ${txn.category || 'N/A'}`);
      });
    
    // Check for suspicious large transactions
    const largeTxns = transactions.filter(txn => parseFloat(txn.amount || 0) > 50000);
    if (largeTxns.length > 0) {
      console.log(`\n⚠️ LARGE TRANSACTIONS (>₹50,000):`);
      largeTxns.forEach(txn => {
        console.log(`   - ₹${parseFloat(txn.amount).toLocaleString('en-IN')}: ${txn.description || 'Unknown'} (${txn.type})`);
      });
    }
  });
  
  // Overall summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 OVERALL SUMMARY');
  console.log(`${'='.repeat(80)}`);
  
  const totalFromStored = statements.reduce((sum, stmt) => sum + (stmt.totalAmount || 0), 0);
  console.log(`Total from stored amounts: ₹${totalFromStored.toLocaleString('en-IN')}`);
  
  // Recalculate from all transactions
  let grandTotal = 0;
  let totalDebits = 0;
  let totalCredits = 0;
  
  statements.forEach(stmt => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || 
                        [];
    
    transactions.forEach(txn => {
      const amount = parseFloat(txn.amount || 0);
      const type = txn.type?.toString().toUpperCase();
      
      if (type === 'DR' || type === 'DEBIT' || (!type && amount > 0)) {
        grandTotal += amount;
        totalDebits++;
      } else if (type === 'CR' || type === 'CREDIT') {
        totalCredits++;
      }
    });
  });
  
  console.log(`Total calculated from transactions: ₹${grandTotal.toLocaleString('en-IN')}`);
  console.log(`Total debit transactions: ${totalDebits}`);
  console.log(`Total credit transactions: ${totalCredits}`);
  console.log(`\nDifference: ₹${Math.abs(totalFromStored - grandTotal).toLocaleString('en-IN')}`);
  
  if (Math.abs(totalFromStored - grandTotal) > 100) {
    console.log(`\n❌ MAJOR DISCREPANCY FOUND!`);
    console.log(`   This explains why the dashboard shows wrong totals.`);
  }
}

console.log('\n✅ Diagnosis complete');

