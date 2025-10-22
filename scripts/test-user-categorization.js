/**
 * Test User Categorization System
 * Run this in browser console to test the categorization logic
 */

// Test transactions that should need review
const testTransactions = [
  {
    description: "PAYMENT RECEIVED",
    amount: 5000,
    type: "Cr"
  },
  {
    description: "1234567890",
    amount: 150,
    type: "Dr"
  },
    {
    description: "ATM",
    amount: 2000,
    type: "Dr"
  },
  {
    description: "SWIGGY BANGALORE",
    amount: 350,
    type: "Dr"
  },
  {
    description: "AMAZON PAY BILLS",
    amount: 1200,
    type: "Dr"
  },
  {
    description: "UNKNOWN MERCHANT",
    amount: 500,
    type: "Dr"
  }
];

console.log('🧪 Testing User Categorization System');
console.log('=====================================');

// Import the smart mapper function
if (typeof window !== 'undefined') {
  // Browser environment
  console.log('📱 Running in browser - you can test this by:');
  console.log('1. Go to dashboard');
  console.log('2. Open browser console');
  console.log('3. Run: getTransactionsNeedingReview(testTransactions)');
  console.log('');
  console.log('Expected results:');
  console.log('- "PAYMENT RECEIVED" → needsReview: true (generic)');
  console.log('- "1234567890" → needsReview: true (numbers only)');
  console.log('- "ATM" → needsReview: true (too short)');
  console.log('- "SWIGGY BANGALORE" → needsReview: false (high confidence)');
  console.log('- "AMAZON PAY BILLS" → needsReview: false (high confidence)');
  console.log('- "UNKNOWN MERCHANT" → needsReview: true (unclear)');
} else {
  // Node.js environment
  console.log('🖥️ Running in Node.js - testing logic directly');
  
  // Mock the smart mapper function
  function getTransactionsNeedingReview(transactions) {
    return transactions.filter(txn => {
      const desc = (txn.description || '').toLowerCase();
      
      // Generic patterns
      if (/payment.*received|transfer|refund/i.test(desc)) {
        return true; // Generic payment
      }
      
      // Numbers only
      if (/^\d+$/.test(desc)) {
        return true; // Numbers only
      }
      
      // Too short
      if (desc.length < 5) {
        return true; // Too short
      }
      
      // High confidence patterns
      if (/swiggy|zomato|amazon|flipkart/i.test(desc)) {
        return false; // High confidence
      }
      
      // Everything else needs review
      return true;
    });
  }
  
  const needsReview = getTransactionsNeedingReview(testTransactions);
  
  console.log(`\n📊 Results:`);
  console.log(`Total transactions: ${testTransactions.length}`);
  console.log(`Need review: ${needsReview.length}`);
  console.log(`Auto-categorized: ${testTransactions.length - needsReview.length}`);
  
  console.log('\n🔍 Transactions needing review:');
  needsReview.forEach((txn, i) => {
    console.log(`${i + 1}. "${txn.description}" - ₹${txn.amount}`);
  });
  
  console.log('\n✅ Auto-categorized transactions:');
  testTransactions.filter(t => !needsReview.includes(t)).forEach((txn, i) => {
    console.log(`${i + 1}. "${txn.description}" - ₹${txn.amount}`);
  });
}

console.log('\n🎯 Next Steps:');
console.log('1. Go to dashboard to see the category review banner');
console.log('2. Click "Review Transactions" to categorize unclear ones');
console.log('3. This will improve your spending insights!');
