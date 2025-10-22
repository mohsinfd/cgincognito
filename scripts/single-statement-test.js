/**
 * Test Single Statement Processing
 * Process just one statement to verify categorization fixes
 */

console.log('🧪 Single Statement Test');
console.log('========================');

// Instructions for single statement test
console.log('\n📋 Steps:');
console.log('1. Go to Gmail Test page');
console.log('2. Select ONLY ONE statement (e.g., HDFC)');
console.log('3. Click "Process Statements"');
console.log('4. Check if transactions are properly categorized');
console.log('5. If good, process remaining statements');

console.log('\n⏱️ Expected Time: 2-3 minutes');
console.log('💡 This tests the fix without processing all statements');

console.log('\n🔍 What to Look For:');
console.log('- Swiggy/Zomato → online_food_ordering');
console.log('- Amazon → amazon_spends');
console.log('- Uber/Ola → other_online_spends');
console.log('- Low "Other Offline" percentage');
