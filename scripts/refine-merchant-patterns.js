/**
 * Refine Merchant Patterns from Your Data
 * 
 * Extracts actual merchant names and generates optimized regex patterns
 * 
 * Run this from browser console
 */

(function refinePatterns() {
  console.log('🔍 Refining Merchant Patterns from Your Data...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  const merchantsByCategory = {};
  
  statements.forEach((stmt) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    transactions.forEach((txn) => {
      if (txn.type === 'Cr' || txn.type === 'credit') return;
      
      const desc = (txn.description || txn.raw_desc || 'Unknown').trim();
      const category = txn.category || 'uncategorized';
      
      if (!merchantsByCategory[category]) {
        merchantsByCategory[category] = new Set();
      }
      
      merchantsByCategory[category].add(desc);
    });
  });
  
  console.log('📋 Generating Optimized Patterns:\n');
  
  // Generate patterns for each category
  Object.entries(merchantsByCategory).forEach(([category, merchants]) => {
    const merchantArray = Array.from(merchants);
    
    if (merchantArray.length === 0) return;
    
    console.log(`\n${category.toUpperCase()}:`);
    console.log(`Merchants: ${merchantArray.length}`);
    
    // Extract unique merchant names (remove locations/variations)
    const uniqueMerchants = new Set();
    
    merchantArray.forEach(merchant => {
      // Normalize: lowercase, remove locations in parentheses
      const normalized = merchant
        .toLowerCase()
        .replace(/\s*\([^)]*\)\s*/g, '') // Remove (location)
        .replace(/\s*,\s*[A-Z]+\s*/g, '') // Remove , LOCATION
        .replace(/\s*[A-Z]{3,}\s*$/g, '') // Remove trailing LOCATION
        .trim();
      
      // Extract main merchant name (first 2-3 words)
      const words = normalized.split(/\s+/).filter(w => w.length > 2);
      const mainName = words.slice(0, 3).join(' ');
      
      if (mainName.length > 3) {
        uniqueMerchants.add(mainName);
      }
    });
    
    console.log(`Unique Patterns: ${uniqueMerchants.size}`);
    
    const patterns = Array.from(uniqueMerchants).slice(0, 15); // Top 15 per category
    
    console.log('\nSuggested Regex Patterns:');
    patterns.forEach(pattern => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      console.log(`  if (desc.includes('${pattern}')) return '${category}';`);
    });
  });
  
  // Generate TypeScript code
  console.log('\n\n📝 TypeScript Code to Copy:\n');
  console.log('const MERCHANT_PATTERNS = {');
  
  Object.entries(merchantsByCategory).forEach(([category, merchants]) => {
    const merchantArray = Array.from(merchants);
    if (merchantArray.length === 0) return;
    
    const uniqueMerchants = new Set();
    merchantArray.forEach(merchant => {
      const normalized = merchant
        .toLowerCase()
        .replace(/\s*\([^)]*\)\s*/g, '')
        .replace(/\s*,\s*[A-Z]+\s*/g, '')
        .replace(/\s*[A-Z]{3,}\s*$/g, '')
        .trim();
      
      const words = normalized.split(/\s+/).filter(w => w.length > 2);
      const mainName = words.slice(0, 3).join(' ');
      
      if (mainName.length > 3) {
        uniqueMerchants.add(mainName);
      }
    });
    
    const patterns = Array.from(uniqueMerchants).slice(0, 10);
    
    if (patterns.length > 0) {
      console.log(`  ${category}: [`);
      patterns.forEach(pattern => {
        console.log(`    '${pattern}',`);
      });
      console.log(`  ],`);
    }
  });
  
  console.log('};');
  
  return merchantsByCategory;
})();

