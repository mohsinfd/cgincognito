/**
 * Build Merchant Master List from Parsed Statements
 * 
 * Analyzes all transactions to create comprehensive merchant/category mapping
 * 
 * Run this from browser console
 */

(function buildMasterList() {
  console.log('🔍 Building Merchant Master List from your statements...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  const merchantMap = new Map(); // merchant name → array of transactions
  const categoryStats = {};
  const bankStats = {};
  
  let totalTransactions = 0;
  let totalAmount = 0;
  
  statements.forEach((stmt, stmtIndex) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    transactions.forEach((txn) => {
      if (txn.type === 'Cr' || txn.type === 'credit') return;
      
      const desc = (txn.description || txn.raw_desc || 'Unknown').trim();
      const amount = Math.abs(txn.amount || 0);
      const category = txn.category || 'uncategorized';
      const bank = stmt.bankCode;
      
      totalTransactions++;
      totalAmount += amount;
      
      // Normalize merchant name (remove common prefixes/suffixes)
      const normalizedMerchant = desc
        .replace(/^(POS\*|ECOM\*|INTL\*|AUTH\*|TXN\*|REF\*)/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!merchantMap.has(normalizedMerchant)) {
        merchantMap.set(normalizedMerchant, []);
      }
      
      merchantMap.get(normalizedMerchant).push({
        description: desc,
        amount,
        category,
        bank,
        date: txn.date
      });
      
      // Category stats
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, total: 0, merchants: new Set() };
      }
      categoryStats[category].count++;
      categoryStats[category].total += amount;
      categoryStats[category].merchants.add(normalizedMerchant);
      
      // Bank stats
      if (!bankStats[bank]) {
        bankStats[bank] = { count: 0, total: 0 };
      }
      bankStats[bank].count++;
      bankStats[bank].total += amount;
    });
  });
  
  console.log(`📊 Summary:`);
  console.log(`Total Transactions: ${totalTransactions}`);
  console.log(`Total Amount: ₹${totalAmount.toLocaleString('en-IN')}`);
  console.log(`Unique Merchants: ${merchantMap.size}`);
  console.log(`Categories: ${Object.keys(categoryStats).length}\n`);
  
  // Group merchants by category
  const merchantsByCategory = {};
  merchantMap.forEach((transactions, merchant) => {
    const category = transactions[0].category;
    if (!merchantsByCategory[category]) {
      merchantsByCategory[category] = [];
    }
    merchantsByCategory[category].push({
      merchant,
      count: transactions.length,
      total: transactions.reduce((sum, t) => sum + t.amount, 0),
      avgAmount: transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length,
      transactions
    });
  });
  
  // Sort by count within each category
  Object.keys(merchantsByCategory).forEach(cat => {
    merchantsByCategory[cat].sort((a, b) => b.count - a.count);
  });
  
  console.log('\n📋 Category Breakdown:\n');
  Object.entries(categoryStats)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([category, stats]) => {
      console.log(`${category}:`);
      console.log(`  Transactions: ${stats.count}`);
      console.log(`  Total: ₹${stats.total.toLocaleString('en-IN')}`);
      console.log(`  Unique Merchants: ${stats.merchants.size}`);
      console.log(`  Avg per Transaction: ₹${Math.round(stats.total / stats.count).toLocaleString('en-IN')}`);
      console.log('');
    });
  
  console.log('\n💳 Top Merchants by Category:\n');
  Object.entries(merchantsByCategory)
    .sort((a, b) => {
      const aTotal = a[1].reduce((sum, m) => sum + m.total, 0);
      const bTotal = b[1].reduce((sum, m) => sum + m.total, 0);
      return bTotal - aTotal;
    })
    .forEach(([category, merchants]) => {
      if (merchants.length === 0) return;
      
      console.log(`\n🏷️  ${category.toUpperCase()} (${merchants.length} merchants):`);
      merchants.slice(0, 10).forEach((m, idx) => {
        console.log(`  ${idx + 1}. ${m.merchant}`);
        console.log(`     ${m.count} transaction(s) | ₹${m.total.toLocaleString('en-IN')} total | ₹${Math.round(m.avgAmount).toLocaleString('en-IN')} avg`);
      });
      if (merchants.length > 10) {
        console.log(`     ... and ${merchants.length - 10} more`);
      }
    });
  
  // Generate regex patterns
  console.log('\n\n🎯 SUGGESTED REGEX PATTERNS:\n');
  console.log('// Copy these into your pre-categorizer\n');
  
  const patterns = {};
  Object.entries(merchantsByCategory).forEach(([category, merchants]) => {
    if (merchants.length === 0) return;
    
    const merchantNames = merchants.map(m => m.merchant.toLowerCase());
    const uniqueNames = [...new Set(merchantNames)];
    
    // Generate pattern-friendly names (extract main words)
    const patternNames = uniqueNames
      .filter(name => name.length > 3) // Skip short names
      .slice(0, 20); // Top 20 per category
    
    if (patternNames.length > 0) {
      patterns[category] = patternNames;
      
      console.log(`${category}: {`);
      console.log(`  patterns: [`);
      patternNames.forEach(name => {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        console.log(`    /${escaped}/i,`);
      });
      console.log(`  ]`);
      console.log(`},`);
      console.log('');
    }
  });
  
  // Anomaly detection
  console.log('\n\n⚠️  ANOMALIES & INCONSISTENCIES:\n');
  
  // Check for merchants appearing in multiple categories
  const merchantCategories = new Map();
  merchantMap.forEach((transactions, merchant) => {
    const categories = [...new Set(transactions.map(t => t.category))];
    if (categories.length > 1) {
      merchantCategories.set(merchant, categories);
    }
  });
  
  if (merchantCategories.size > 0) {
    console.log('Merchants with multiple categories:');
    merchantCategories.forEach((categories, merchant) => {
      console.log(`  ${merchant}: ${categories.join(', ')}`);
    });
  } else {
    console.log('✓ No multi-category merchants found');
  }
  
  // Check for large transactions that might be miscategorized
  console.log('\nLarge transactions (₹50k+) requiring review:');
  const largeTransactions = [];
  merchantMap.forEach((transactions, merchant) => {
    transactions.forEach(t => {
      if (t.amount >= 50000) {
        largeTransactions.push({
          merchant,
          amount: t.amount,
          category: t.category,
          bank: t.bank,
          date: t.date
        });
      }
    });
  });
  
  largeTransactions
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20)
    .forEach(t => {
      console.log(`  ₹${t.amount.toLocaleString('en-IN')} - ${t.merchant} (${t.category}) - ${t.bank} - ${t.date}`);
    });
  
  // Return structured data
  return {
    summary: {
      totalTransactions,
      totalAmount,
      uniqueMerchants: merchantMap.size,
      categories: Object.keys(categoryStats).length
    },
    categoryStats,
    merchantsByCategory,
    suggestedPatterns: patterns,
    anomalies: {
      multiCategoryMerchants: Array.from(merchantCategories.entries()),
      largeTransactions: largeTransactions.slice(0, 50)
    }
  };
})();

