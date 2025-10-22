/**
 * Test script to verify dashboard data saving and loading
 * This will help debug why the dashboard shows placeholder data
 */

console.log('🧪 Testing Dashboard Data Fix');
console.log('=============================');

// Test 1: Check if the saveStatement function works correctly
console.log('\n📊 Testing saveStatement function...');

// Mock localStorage for testing
const mockLocalStorage = {
  data: {},
  getItem: function(key) {
    return this.data[key] || null;
  },
  setItem: function(key, value) {
    this.data[key] = value;
  },
  removeItem: function(key) {
    delete this.data[key];
  }
};

// Mock global localStorage
global.localStorage = mockLocalStorage;

// Import the storage functions
const { saveStatement, getStatements } = require('../src/lib/storage/browser-storage.ts');

// Test data structure (similar to what comes from the API)
const testStatementData = {
  id: 'test_statement_1',
  status: 'COMPLETED',
  content: {
    summary: {
      statement_date: '15102025',
      total_dues: 45000
    },
    card_details: {
      num: '1234567890123456'
    },
    transactions: [
      {
        date: '14/10/2025',
        description: 'BLINKIT,GURGAON',
        amount: 450,
        category: 'Food & Beverage'
      },
      {
        date: '15/10/2025', 
        description: 'UBER INDIA SYSTE PVT,NOIDA',
        amount: 200,
        category: 'Travel'
      }
    ]
  }
};

console.log('💾 Saving test statement...');
try {
  saveStatement('test_statement_1', 'hsbc', testStatementData);
  console.log('✅ Statement saved successfully');
} catch (error) {
  console.log('❌ Error saving statement:', error.message);
}

console.log('\n📂 Loading statements...');
try {
  const statements = getStatements();
  console.log(`✅ Loaded ${statements.length} statements`);
  
  if (statements.length > 0) {
    const stmt = statements[0];
    console.log('📊 First statement details:');
    console.log(`  - ID: ${stmt.id}`);
    console.log(`  - Bank: ${stmt.bankCode}`);
    console.log(`  - Transactions: ${stmt.transactionCount}`);
    console.log(`  - Total Amount: ${stmt.totalAmount}`);
    console.log(`  - Card Last 4: ${stmt.cardLast4}`);
  }
} catch (error) {
  console.log('❌ Error loading statements:', error.message);
}

// Test 2: Check dashboard component structure
console.log('\n🎯 Testing dashboard component...');
const fs = require('fs');
const dashboardContent = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

if (dashboardContent.includes('getStatements()')) {
  console.log('✅ Dashboard uses getStatements()');
} else {
  console.log('❌ Dashboard does not use getStatements()');
}

if (dashboardContent.includes('MonthlySpendSummary')) {
  console.log('✅ Dashboard includes MonthlySpendSummary component');
} else {
  console.log('❌ Dashboard missing MonthlySpendSummary component');
}

// Test 3: Check MonthlySpendSummary component
console.log('\n📈 Testing MonthlySpendSummary component...');
const summaryContent = fs.readFileSync('src/components/monthly-spend-summary.tsx', 'utf8');

if (summaryContent.includes('statements.forEach')) {
  console.log('✅ MonthlySpendSummary iterates through statements');
} else {
  console.log('❌ MonthlySpendSummary does not iterate through statements');
}

if (summaryContent.includes('transactions')) {
  console.log('✅ MonthlySpendSummary processes transactions');
} else {
  console.log('❌ MonthlySpendSummary does not process transactions');
}

console.log('\n🎉 Dashboard Fix Test Complete!');
console.log('================================');
console.log('\n🔍 Next Steps:');
console.log('1. Run the processing again with debugging enabled');
console.log('2. Check browser console for saveStatement logs');
console.log('3. Check browser localStorage for saved data');
console.log('4. Verify dashboard loads the saved statements');
console.log('\n💡 Expected Debug Output:');
console.log('- 💾 Saving statement: [id] ([bank])');
console.log('- 📊 Content structure: {hasContent: true, hasTransactions: true, ...}');
console.log('- ✅ Statement saved to browser storage');
console.log('- 📂 Loading statements from localStorage: found');
console.log('- 📊 Loaded X statements from localStorage: [list]');
