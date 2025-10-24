// Test script to check LLM response structure
// Run this in browser console after connecting Gmail and processing statements

console.log('🔍 TESTING LLM RESPONSE STRUCTURE');
console.log('==================================');

// This will help us see what the LLM is actually returning
// Run this after processing statements to see the raw LLM response

// Check if there are any statements in memory (not localStorage)
if (window.processedStatements) {
  console.log('📄 Found processed statements in memory:', window.processedStatements.length);
  window.processedStatements.forEach((stmt, index) => {
    console.log(`\n📄 Statement ${index + 1}: ${stmt.bankCode}`);
    if (stmt.processing_result?.parsedData) {
      console.log('Raw LLM response keys:', Object.keys(stmt.processing_result.parsedData));
      console.log('Card details from LLM:', stmt.processing_result.parsedData.card_details);
      console.log('Full LLM response:', stmt.processing_result.parsedData);
    }
  });
} else {
  console.log('❌ No processed statements found in memory');
  console.log('💡 Try processing statements first, then run this script');
}

// Alternative: Check if there's a way to access the raw API response
console.log('\n🔍 Checking for API response data...');
console.log('Available global variables:', Object.keys(window).filter(key => key.includes('statement') || key.includes('response')));
