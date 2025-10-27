/**
 * Remove Duplicate Statements Script
 * 
 * Removes duplicate statements from localStorage based on message_id
 * 
 * Run this from browser console:
 * 1. Open DevTools (F12)
 * 2. Copy this entire file content
 * 3. Paste in Console and press Enter
 */

(function removeDuplicates() {
  console.log('🔧 Starting duplicate removal...');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  console.log(`📊 Found ${statements.length} statements`);
  
  // Create a map to track unique statements by message_id
  const uniqueMap = new Map();
  let duplicateCount = 0;
  
  statements.forEach((stmt, index) => {
    const messageId = stmt.message_id || stmt.id;
    
    if (!messageId) {
      console.log(`⚠️ Statement ${index + 1} (${stmt.bankCode}): No message_id, keeping for safety`);
      uniqueMap.set(`no-id-${index}`, stmt);
      return;
    }
    
    if (uniqueMap.has(messageId)) {
      console.log(`❌ Removing duplicate: Statement ${index + 1} (${stmt.bankCode}) - message_id: ${messageId}`);
      duplicateCount++;
    } else {
      uniqueMap.set(messageId, stmt);
    }
  });
  
  const uniqueStatements = Array.from(uniqueMap.values());
  
  if (duplicateCount > 0) {
    localStorage.setItem('cardgenius_statements', JSON.stringify(uniqueStatements));
    console.log(`\n✅ Removed ${duplicateCount} duplicates`);
    console.log(`📊 ${statements.length} → ${uniqueStatements.length} statements`);
    console.log(`\n🎉 Refresh dashboard to see cleaned data.`);
  } else {
    console.log(`\n✓ No duplicates found`);
  }
  
  return {
    total: statements.length,
    unique: uniqueStatements.length,
    removed: duplicateCount
  };
})();

