/**
 * Check Statement Structure
 * 
 * See what's actually in the statements
 * 
 * Run this from browser console
 */

(function checkStructure() {
  console.log('🔍 Checking Statement Structure...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  console.log(`Found ${statements.length} statements\n`);
  
  if (statements.length === 0) {
    console.log('No statements found!');
    return;
  }
  
  // Check first statement in detail
  const first = statements[0];
  
  console.log('📋 First Statement Structure:');
  console.log('Bank:', first.bankCode);
  console.log('Has content:', !!first.content);
  console.log('Has nested content:', !!first.content?.content);
  
  if (first.content?.content) {
    console.log('\nNested Content Keys:', Object.keys(first.content.content));
    console.log('Has card_details:', !!first.content.content.card_details);
    
    if (first.content.content.card_details) {
      console.log('Card Details:', first.content.content.card_details);
    }
  }
  
  // Check all banks
  console.log('\n📊 All Banks:\n');
  const banks = [...new Set(statements.map(s => s.bankCode))];
  
  banks.forEach(bank => {
    const bankStmts = statements.filter(s => s.bankCode === bank);
    console.log(`${bank.toUpperCase()}: ${bankStmts.length} statements`);
    
    bankStmts.forEach((stmt, idx) => {
      const cardType = stmt.content?.content?.card_details?.card_type || 'Not found';
      const cardNum = stmt.content?.content?.card_details?.num || stmt.cardLast4 || 'Not found';
      console.log(`  Statement ${idx + 1}: ${cardType} (****${cardNum})`);
    });
  });
  
  return statements.slice(0, 1);
})();

