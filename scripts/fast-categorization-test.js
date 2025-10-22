/**
 * Fast Transaction Analysis - Skip Processing
 * Analyze existing localStorage data to test categorization fixes
 */

console.log('🚀 Fast Transaction Analysis');
console.log('============================');

// Get existing statements from localStorage
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
        originalCategory: t.category // Keep original LLM category
      })));
    }
  });
  
  console.log(`📈 Total transactions: ${allTransactions.length}`);
  
  // Test the new categorization logic
  console.log('\n🔍 Testing New Categorization Logic:');
  
  // Simulate the new logic: preserve LLM categories, use mapper as fallback
  const validLLMCategories = [
    'amazon_spends', 'flipkart_spends', 'grocery_spends_online', 'online_food_ordering',
    'dining_or_going_out', 'other_online_spends', 'other_offline_spends', 'flights',
    'hotels', 'mobile_phone_bills', 'electricity_bills', 'water_bills', 'ott_channels',
    'fuel', 'school_fees', 'rent', 'insurance_health', 'insurance_car_or_bike',
    'large_electronics', 'all_pharmacy'
  ];
  
  const newCategorizedTransactions = allTransactions.map(txn => {
    const originalCategory = txn.originalCategory || '';
    
    // New logic: preserve LLM categories
    if (originalCategory && validLLMCategories.includes(originalCategory.toLowerCase())) {
      return {
        ...txn,
        newCategory: originalCategory.toLowerCase(),
        categorySource: 'LLM'
      };
    }
    
    // Fallback to simple pattern matching
    const desc = (txn.description || '').toLowerCase();
    let fallbackCategory = 'other_offline_spends';
    
    if (desc.includes('swiggy') || desc.includes('zomato')) {
      fallbackCategory = 'online_food_ordering';
    } else if (desc.includes('amazon')) {
      fallbackCategory = 'amazon_spends';
    } else if (desc.includes('flipkart')) {
      fallbackCategory = 'flipkart_spends';
    } else if (desc.includes('uber') || desc.includes('ola')) {
      fallbackCategory = 'other_online_spends';
    } else if (desc.includes('netflix') || desc.includes('prime')) {
      fallbackCategory = 'ott_channels';
    } else if (desc.includes('petrol') || desc.includes('fuel')) {
      fallbackCategory = 'fuel';
    } else if (desc.includes('restaurant') || desc.includes('cafe')) {
      fallbackCategory = 'dining_or_going_out';
    }
    
    return {
      ...txn,
      newCategory: fallbackCategory,
      categorySource: 'Fallback'
    };
  });
  
  // Analyze results
  const oldCategoryAnalysis = {};
  const newCategoryAnalysis = {};
  
  allTransactions.forEach(txn => {
    const oldCat = txn.category || 'unknown';
    oldCategoryAnalysis[oldCat] = (oldCategoryAnalysis[oldCat] || 0) + 1;
  });
  
  newCategorizedTransactions.forEach(txn => {
    const newCat = txn.newCategory || 'unknown';
    newCategoryAnalysis[newCat] = (newCategoryAnalysis[newCat] || 0) + 1;
  });
  
  console.log('\n📊 OLD Category Distribution:');
  Object.entries(oldCategoryAnalysis)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      const percentage = ((count / allTransactions.length) * 100).toFixed(1);
      console.log(`  ${category}: ${count} (${percentage}%)`);
    });
  
  console.log('\n📊 NEW Category Distribution:');
  Object.entries(newCategoryAnalysis)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      const percentage = ((count / allTransactions.length) * 100).toFixed(1);
      console.log(`  ${category}: ${count} (${percentage}%)`);
    });
  
  // Show improvements
  const oldOtherOffline = oldCategoryAnalysis['other_offline_spends'] || 0;
  const newOtherOffline = newCategoryAnalysis['other_offline_spends'] || 0;
  const improvement = oldOtherOffline - newOtherOffline;
  
  console.log(`\n🎯 Improvement Analysis:`);
  console.log(`  Old "Other Offline": ${oldOtherOffline} (${((oldOtherOffline / allTransactions.length) * 100).toFixed(1)}%)`);
  console.log(`  New "Other Offline": ${newOtherOffline} (${((newOtherOffline / allTransactions.length) * 100).toFixed(1)}%)`);
  console.log(`  Improvement: ${improvement} transactions moved to correct categories`);
  
  // Show sample transactions that would be re-categorized
  console.log('\n🔄 Sample Re-categorized Transactions:');
  const recategorized = newCategorizedTransactions.filter(txn => 
    txn.category !== txn.newCategory && txn.categorySource === 'LLM'
  );
  
  recategorized.slice(0, 10).forEach(txn => {
    console.log(`  "${txn.description}"`);
    console.log(`    OLD: ${txn.category} → NEW: ${txn.newCategory}`);
  });
  
  // Show LLM vs Fallback usage
  const llmCount = newCategorizedTransactions.filter(txn => txn.categorySource === 'LLM').length;
  const fallbackCount = newCategorizedTransactions.filter(txn => txn.categorySource === 'Fallback').length;
  
  console.log(`\n📈 Category Source Analysis:`);
  console.log(`  LLM Categories: ${llmCount} (${((llmCount / allTransactions.length) * 100).toFixed(1)}%)`);
  console.log(`  Fallback Categories: ${fallbackCount} (${((fallbackCount / allTransactions.length) * 100).toFixed(1)}%)`);
}

console.log('\n✅ Fast Analysis Complete!');
console.log('This shows what the categorization would look like with the fixes applied.');
