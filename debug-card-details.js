// Test script to check what the LLM is actually returning
// Run this in browser console after processing statements

console.log('🔍 DEBUGGING CARD DETAILS EXTRACTION');
console.log('=====================================');

// Get all statements from localStorage
const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
console.log(`📊 Found ${statements.length} statements`);

statements.forEach((stmt, index) => {
  console.log(`\n📄 Statement ${index + 1}: ${stmt.bankCode}`);
  console.log('Raw content structure:', {
    hasContent: !!stmt.content,
    hasNestedContent: !!stmt.content?.content,
    contentKeys: Object.keys(stmt.content || {}),
    nestedContentKeys: Object.keys(stmt.content?.content || {})
  });
  
  if (stmt.content?.content) {
    console.log('Card details:', stmt.content.content.card_details);
    console.log('Transactions count:', stmt.content.content.transactions?.length || 0);
    console.log('Summary:', stmt.content.content.summary);
  }
  
  // Check if there's any card info in the raw processing result
  if (stmt.processing_result?.parsedData) {
    console.log('Processing result keys:', Object.keys(stmt.processing_result.parsedData));
    console.log('Processing result card_details:', stmt.processing_result.parsedData.card_details);
  }
});
