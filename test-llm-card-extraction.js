// Test script to check what the LLM is actually seeing in the PDF content
// Run this in browser console to test LLM extraction on a single statement

console.log('🔍 TESTING LLM CARD NUMBER EXTRACTION');
console.log('=====================================');

// This will help us see what the LLM is actually extracting
// We need to test with a fresh statement to see the LLM response

console.log('💡 To test this:');
console.log('1. Go to /gmail-test page');
console.log('2. Connect Gmail and process ONE statement');
console.log('3. Look for "🔍 LLM Response Debug:" logs in console');
console.log('4. Check if card_details contains actual card numbers');

console.log('\n📊 Current localStorage data shows:');
const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
console.log(`- ${statements.length} statements processed`);
console.log(`- All card numbers: ${statements.map(s => s.content.content.card_details.num).join(', ')}`);
console.log(`- All are "Unknown" - this means LLM is not finding card numbers in PDFs`);

console.log('\n🔍 Possible causes:');
console.log('1. PDFs are password-protected and LLM sees encrypted content');
console.log('2. Card numbers are in a format LLM can\'t recognize');
console.log('3. LLM prompt needs to be more specific about where to look');
console.log('4. PDF content extraction is failing');

console.log('\n💡 Next steps:');
console.log('1. Test with a fresh statement to see LLM debug logs');
console.log('2. Check if PDFs are being decrypted properly');
console.log('3. Improve LLM prompt to be more specific about card number extraction');
