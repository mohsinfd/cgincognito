/**
 * Dashboard Data Diagnostic Script
 * Checks the actual structure of saved statement data
 */

console.log('🔍 Dashboard Data Diagnostic');
console.log('============================');

// Simulate what the browser would have in localStorage
const sampleData = {
  id: 'sample_message_id',
  uploadedAt: '2025-01-16T10:00:00.000Z',
  bankCode: 'axis',
  cardLast4: '1234',
  totalAmount: 50000,
  transactionCount: 15,
  content: {
    id: 'sample_message_id',
    status: 'COMPLETED',
    content: {
      transactions: [
        {
          date: '15/10/2025',
          description: 'AMAZON PAY',
          amount: 2500,
          type: 'Dr',
          category: 'Online Shopping'
        },
        {
          date: '14/10/2025', 
          description: 'SWIGGY',
          amount: 800,
          type: 'Dr',
          category: 'Food Delivery'
        }
      ],
      summary: {
        statement_date: '15102025',
        total_dues: 50000
      },
      card_details: {
        num: '1234567890121234'
      }
    }
  }
};

console.log('📊 Sample Data Structure:');
console.log(JSON.stringify(sampleData, null, 2));

console.log('\n🔍 Data Access Paths:');
console.log('statements[0].content?.content?.transactions:', sampleData.content?.content?.transactions?.length || 0);
console.log('statements[0].content?.content?.card_details?.num:', sampleData.content?.content?.card_details?.num);
console.log('statements[0].bankCode:', sampleData.bankCode);
console.log('statements[0].transactionCount:', sampleData.transactionCount);

console.log('\n💡 Potential Issues:');
console.log('1. Check if transactions array exists and has data');
console.log('2. Check if card_details.num exists and is properly formatted');
console.log('3. Check if transaction.type field matches expected values (Dr/Cr)');
console.log('4. Check if statement_date is in DDMMYYYY format');

console.log('\n✅ Expected Dashboard Behavior:');
console.log('- MonthlySpendSummary should show spending by category');
console.log('- OptimizerResults should calculate potential savings');
console.log('- Card spending breakdown should show per-card totals');

console.log('\n🚨 Common Issues:');
console.log('- Empty transactions array → "No transactions found"');
console.log('- Missing card_details → "Unknown" card numbers');
console.log('- Wrong transaction.type → No transactions counted');
console.log('- Invalid statement_date → Wrong month selection');
