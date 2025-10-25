// Manual card matching system
// This will allow you to specify the correct card names for each bank

console.log('🔧 MANUAL CARD MATCHING SYSTEM');
console.log('==============================');

// Define your actual cards
const userCards = {
  'hsbc': 'HSBC Live+ Credit Card',
  'hdfc': 'HDFC Millenia Credit Card', 
  'yes': 'YES BANK POP-CLUB Credit Card',
  'sbi': 'SBI CASHBACK Credit Card',
  'axis': 'AXIS MAGNUS Credit Card',
  'idfc': 'IDFC FIRST SELECT Credit Card',
  'rbl': 'RBL Shoprite Credit Card'
};

console.log('📋 Your actual cards:');
Object.entries(userCards).forEach(([bank, card]) => {
  console.log(`- ${bank.toUpperCase()}: ${card}`);
});

console.log('\n💡 To fix the card names:');
console.log('1. Run this script to update localStorage');
console.log('2. Refresh the dashboard to see correct card names');
console.log('3. The optimizer will now use the correct card names');

// Update localStorage with correct card names
const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
let updatedCount = 0;

statements.forEach(stmt => {
  const bankCode = stmt.bankCode;
  const correctCard = userCards[bankCode];
  
  if (correctCard && stmt.content?.content?.card_details) {
    // Update card details
    stmt.content.content.card_details.card_type = correctCard;
    stmt.content.content.card_details.num = correctCard.split(' ').pop() || 'Unknown';
    
    // Update cardLast4
    stmt.cardLast4 = stmt.content.content.card_details.num.slice(-4);
    
    updatedCount++;
  }
});

// Save updated statements
localStorage.setItem('cardgenius_statements', JSON.stringify(statements));

console.log(`\n✅ Updated ${updatedCount} statements with correct card names`);
console.log('🔄 Refresh the dashboard to see the changes');
