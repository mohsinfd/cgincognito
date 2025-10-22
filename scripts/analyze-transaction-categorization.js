/**
 * Transaction Categorization Analyzer
 * Analyze why so many transactions are going to "Other Offline"
 */

console.log('🔍 Transaction Categorization Analysis');
console.log('=====================================');

// This would run in browser console to analyze actual transaction data
console.log(`
To analyze transaction categorization, run this in your browser console:

// Get all statements from localStorage
const data = localStorage.getItem('cardgenius_statements');
if (data) {
  const statements = JSON.parse(data);
  
  // Collect all transactions
  const allTransactions = [];
  statements.forEach(stmt => {
    if (stmt.content?.content?.transactions) {
      allTransactions.push(...stmt.content.content.transactions.map(t => ({
        ...t,
        bankCode: stmt.bankCode
      })));
    }
  });
  
  console.log('Total transactions:', allTransactions.length);
  
  // Analyze transaction descriptions
  const descriptionAnalysis = {};
  const categoryAnalysis = {};
  
  allTransactions.forEach(txn => {
    const desc = (txn.description || '').toLowerCase();
    const category = txn.category || 'unknown';
    
    // Count by description patterns
    if (desc.includes('swiggy') || desc.includes('zomato')) {
      descriptionAnalysis['food_delivery'] = (descriptionAnalysis['food_delivery'] || 0) + 1;
    } else if (desc.includes('amazon')) {
      descriptionAnalysis['amazon'] = (descriptionAnalysis['amazon'] || 0) + 1;
    } else if (desc.includes('flipkart')) {
      descriptionAnalysis['flipkart'] = (descriptionAnalysis['flipkart'] || 0) + 1;
    } else if (desc.includes('grocery') || desc.includes('bigbasket') || desc.includes('grofers')) {
      descriptionAnalysis['grocery'] = (descriptionAnalysis['grocery'] || 0) + 1;
    } else if (desc.includes('uber') || desc.includes('ola')) {
      descriptionAnalysis['ride_sharing'] = (descriptionAnalysis['ride_sharing'] || 0) + 1;
    } else if (desc.includes('restaurant') || desc.includes('cafe')) {
      descriptionAnalysis['dining'] = (descriptionAnalysis['dining'] || 0) + 1;
    } else {
      descriptionAnalysis['other'] = (descriptionAnalysis['other'] || 0) + 1;
    }
    
    // Count by LLM-assigned category
    categoryAnalysis[category] = (categoryAnalysis[category] || 0) + 1;
  });
  
  console.log('Description patterns found:', descriptionAnalysis);
  console.log('LLM categories assigned:', categoryAnalysis);
  
  // Show sample transactions that might be misclassified
  console.log('\\nSample transactions:');
  allTransactions.slice(0, 10).forEach((txn, i) => {
    console.log(\`\${i+1}. \${txn.description} - \${txn.category} - ₹\${txn.amount} (\${txn.bankCode})\`);
  });
  
  // Find transactions that should be online but are categorized as offline
  const potentiallyMisclassified = allTransactions.filter(txn => {
    const desc = (txn.description || '').toLowerCase();
    return (
      (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('amazon') || 
       desc.includes('flipkart') || desc.includes('bigbasket') || desc.includes('grofers')) &&
      txn.category === 'other_offline_spends'
    );
  });
  
  console.log('\\nPotentially misclassified transactions:', potentiallyMisclassified.length);
  potentiallyMisclassified.slice(0, 5).forEach(txn => {
    console.log(\`- \${txn.description} - \${txn.category} - ₹\${txn.amount}\`);
  });
}
`);

console.log('\n💡 Expected Issues:');
console.log('1. LLM parsing descriptions incorrectly');
console.log('2. Transaction descriptions too generic');
console.log('3. Category mapping logic too restrictive');
console.log('4. Default fallback catching too many transactions');

console.log('\n🔧 Next Steps:');
console.log('1. Run the analysis script in browser console');
console.log('2. Check if recognizable merchants are being misclassified');
console.log('3. Review LLM parsing accuracy');
console.log('4. Adjust categorization patterns if needed');
