/**
 * Dashboard Data Checker
 * Check what's actually stored in localStorage
 */

console.log('🔍 Dashboard Data Analysis');
console.log('==========================');

// This would run in browser console
console.log(`
To check your dashboard data, open your browser's Developer Tools (F12) and run this in the Console:

// Check localStorage data
const data = localStorage.getItem('cardgenius_statements');
console.log('Raw localStorage data:', data);

if (data) {
  const statements = JSON.parse(data);
  console.log('Number of statements:', statements.length);
  
  statements.forEach((stmt, i) => {
    console.log(\`Statement \${i+1}:\`, {
      id: stmt.id,
      bankCode: stmt.bankCode,
      transactionCount: stmt.transactionCount,
      totalAmount: stmt.totalAmount,
      cardLast4: stmt.cardLast4,
      hasContent: !!stmt.content,
      hasTransactions: !!stmt.content?.content?.transactions,
      transactionCountInContent: stmt.content?.content?.transactions?.length || 0,
      cardDetails: stmt.content?.content?.card_details,
      summary: stmt.content?.content?.summary
    });
  });
  
  // Check for data corruption
  const bankCounts = {};
  const totalTransactions = [];
  
  statements.forEach(stmt => {
    bankCounts[stmt.bankCode] = (bankCounts[stmt.bankCode] || 0) + 1;
    if (stmt.content?.content?.transactions) {
      totalTransactions.push(...stmt.content.content.transactions);
    }
  });
  
  console.log('Bank distribution:', bankCounts);
  console.log('Total transactions across all statements:', totalTransactions.length);
  
  // Check for YES Bank corruption
  const yesStatements = statements.filter(s => s.bankCode === 'yes');
  const yesTransactions = yesStatements.reduce((sum, s) => sum + (s.content?.content?.transactions?.length || 0), 0);
  console.log('YES Bank statements:', yesStatements.length);
  console.log('YES Bank transactions:', yesTransactions);
}

// Clear corrupted data (if needed)
// localStorage.removeItem('cardgenius_statements');
`);

console.log('\n💡 Expected Issues:');
console.log('1. All transactions showing under "YES ****Unknown"');
console.log('2. Only 2 cards in registry instead of 7');
console.log('3. Category mapping showing 81.7% "Other Offline"');
console.log('4. SBI statements failing with wrong passwords');

console.log('\n🔧 Next Steps:');
console.log('1. Check browser console data');
console.log('2. Clear localStorage if corrupted');
console.log('3. Re-process statements with correct card details');
console.log('4. Fix SBI password generation');
