/**
 * Debug Card Extraction from Statements
 * 
 * Shows what card_type was extracted from each bank
 * 
 * Run this from browser console
 */

(function debugCardExtraction() {
  console.log('🔍 Debugging Card Extraction...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  const bankCards = {};
  
  statements.forEach((stmt) => {
    const bank = stmt.bankCode;
    
    if (!bankCards[bank]) {
      bankCards[bank] = [];
    }
    
    const cardType = stmt.content?.content?.card_details?.card_type ||
                    stmt.content?.card_details?.card_type ||
                    stmt.card_details?.card_type ||
                    'Unknown';
    
    const cardNum = stmt.content?.content?.card_details?.num ||
                   stmt.content?.card_details?.num ||
                   stmt.card_details?.num ||
                   stmt.cardLast4 ||
                   'Unknown';
    
    bankCards[bank].push({
      cardType,
      cardNum,
      statementDate: stmt.content?.content?.summary?.statement_date || stmt.content?.summary?.statement_date || 'Unknown'
    });
  });
  
  console.log('📋 Card Extraction by Bank:\n');
  
  Object.entries(bankCards).forEach(([bank, cards]) => {
    console.log(`${bank.toUpperCase()}:`);
    const uniqueCards = [...new Set(cards.map(c => c.cardType))];
    console.log(`  Unique Card Types: ${uniqueCards.join(', ')}`);
    cards.forEach((c, idx) => {
      console.log(`  Statement ${idx + 1}: "${c.cardType}" (****${c.cardNum})`);
    });
    console.log('');
  });
  
  console.log('\n🎯 Expected Card Selection:');
  console.log('Only banks with "Unknown" card_type or low confidence should prompt user');
  
  return bankCards;
})();

