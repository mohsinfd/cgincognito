/**
 * Transaction Categorization Analysis Script
 * Run this in browser console to analyze why 81.7% transactions are "Other Offline"
 */

console.log('🔍 Transaction Categorization Analysis');
console.log('=====================================');

// Get all statements from localStorage
const data = localStorage.getItem('cardgenius_statements');
if (!data) {
  console.log('❌ No statements found in localStorage');
} else {
  const statements = JSON.parse(data);
  console.log(`📊 Found ${statements.length} statements`);
  
  // Collect all transactions
  const allTransactions = [];
  statements.forEach(stmt => {
    if (stmt.content?.content?.transactions) {
      allTransactions.push(...stmt.content.content.transactions.map(t => ({
        ...t,
        bankCode: stmt.bankCode || stmt.bank_code,
        statementDate: stmt.content?.content?.summary?.statement_date || stmt.statement_date
      })));
    }
  });
  
  console.log(`📈 Total transactions: ${allTransactions.length}`);
  
  // Analyze transaction descriptions
  const descriptionAnalysis = {};
  const categoryAnalysis = {};
  const merchantAnalysis = {};
  
  allTransactions.forEach(txn => {
    const desc = (txn.description || '').toLowerCase();
    const category = txn.category || 'unknown';
    
    // Count by category
    categoryAnalysis[category] = (categoryAnalysis[category] || 0) + 1;
    
    // Analyze merchant patterns
    if (desc.includes('swiggy') || desc.includes('bundl technologies')) {
      merchantAnalysis['swiggy'] = (merchantAnalysis['swiggy'] || 0) + 1;
    } else if (desc.includes('zomato')) {
      merchantAnalysis['zomato'] = (merchantAnalysis['zomato'] || 0) + 1;
    } else if (desc.includes('amazon')) {
      merchantAnalysis['amazon'] = (merchantAnalysis['amazon'] || 0) + 1;
    } else if (desc.includes('flipkart')) {
      merchantAnalysis['flipkart'] = (merchantAnalysis['flipkart'] || 0) + 1;
    } else if (desc.includes('bigbasket') || desc.includes('grofers')) {
      merchantAnalysis['grocery_online'] = (merchantAnalysis['grocery_online'] || 0) + 1;
    } else if (desc.includes('uber') || desc.includes('ola')) {
      merchantAnalysis['ride_sharing'] = (merchantAnalysis['ride_sharing'] || 0) + 1;
    } else if (desc.includes('restaurant') || desc.includes('cafe')) {
      merchantAnalysis['dining'] = (merchantAnalysis['dining'] || 0) + 1;
    } else if (desc.includes('petrol') || desc.includes('fuel')) {
      merchantAnalysis['fuel'] = (merchantAnalysis['fuel'] || 0) + 1;
    } else if (desc.includes('netflix') || desc.includes('prime') || desc.includes('spotify')) {
      merchantAnalysis['ott'] = (merchantAnalysis['ott'] || 0) + 1;
    } else {
      merchantAnalysis['other'] = (merchantAnalysis['other'] || 0) + 1;
    }
    
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
  });
  
  console.log('\n📊 Category Distribution:');
  Object.entries(categoryAnalysis)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      const percentage = ((count / allTransactions.length) * 100).toFixed(1);
      console.log(`  ${category}: ${count} (${percentage}%)`);
    });
  
  console.log('\n🏪 Merchant Patterns Found:');
  Object.entries(merchantAnalysis)
    .sort(([,a], [,b]) => b - a)
    .forEach(([merchant, count]) => {
      const percentage = ((count / allTransactions.length) * 100).toFixed(1);
      console.log(`  ${merchant}: ${count} (${percentage}%)`);
    });
  
  console.log('\n🔍 Description Patterns:');
  Object.entries(descriptionAnalysis)
    .sort(([,a], [,b]) => b - a)
    .forEach(([pattern, count]) => {
      const percentage = ((count / allTransactions.length) * 100).toFixed(1);
      console.log(`  ${pattern}: ${count} (${percentage}%)`);
    });
  
  // Show sample transactions that might be misclassified
  console.log('\n📋 Sample Transactions:');
  allTransactions.slice(0, 15).forEach((txn, i) => {
    console.log(`${i+1}. "${txn.description}" - ${txn.category} - ₹${txn.amount} (${txn.bankCode})`);
  });
  
  // Find transactions that should be online but are categorized as offline
  const potentiallyMisclassified = allTransactions.filter(txn => {
    const desc = (txn.description || '').toLowerCase();
    return (
      (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('amazon') || 
       desc.includes('flipkart') || desc.includes('bigbasket') || desc.includes('grofers') ||
       desc.includes('uber') || desc.includes('ola') || desc.includes('netflix') ||
       desc.includes('prime') || desc.includes('spotify')) &&
      txn.category === 'other_offline_spends'
    );
  });
  
  console.log(`\n❌ Potentially Misclassified Transactions: ${potentiallyMisclassified.length}`);
  potentiallyMisclassified.slice(0, 10).forEach(txn => {
    console.log(`- "${txn.description}" - ${txn.category} - ₹${txn.amount}`);
  });
  
  // Analyze "Other Offline" transactions specifically
  const otherOfflineTransactions = allTransactions.filter(txn => txn.category === 'other_offline_spends');
  console.log(`\n🔍 "Other Offline" Analysis (${otherOfflineTransactions.length} transactions):`);
  
  const otherOfflineDescriptions = {};
  otherOfflineTransactions.forEach(txn => {
    const desc = txn.description || 'No description';
    otherOfflineDescriptions[desc] = (otherOfflineDescriptions[desc] || 0) + 1;
  });
  
  // Show most common "Other Offline" descriptions
  Object.entries(otherOfflineDescriptions)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .forEach(([desc, count]) => {
      console.log(`  "${desc}": ${count} times`);
    });
  
  // Check if LLM is parsing descriptions correctly
  console.log('\n🤖 LLM Parsing Quality Check:');
  const hasDescription = allTransactions.filter(txn => txn.description && txn.description.trim().length > 0);
  const noDescription = allTransactions.filter(txn => !txn.description || txn.description.trim().length === 0);
  
  console.log(`  Transactions with descriptions: ${hasDescription.length} (${((hasDescription.length / allTransactions.length) * 100).toFixed(1)}%)`);
  console.log(`  Transactions without descriptions: ${noDescription.length} (${((noDescription.length / allTransactions.length) * 100).toFixed(1)}%)`);
  
  if (noDescription.length > 0) {
    console.log('\n  Sample transactions without descriptions:');
    noDescription.slice(0, 5).forEach(txn => {
      console.log(`    - Category: ${txn.category}, Amount: ₹${txn.amount}`);
    });
  }
}

console.log('\n💡 Analysis Complete!');
console.log('Key findings will help identify why transactions are misclassified.');
