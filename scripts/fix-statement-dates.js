/**
 * Fix Statement Dates Migration Script
 * 
 * This script fixes the statement_date field in localStorage by:
 * 1. Reading all statements from localStorage
 * 2. Extracting the actual email date from the stored statement data
 * 3. Updating the statement_date to use the email date if available
 * 4. Saving the corrected statements back to localStorage
 * 
 * Run this from browser console:
 * 1. Open DevTools (F12)
 * 2. Copy this entire file content
 * 3. Paste in Console and press Enter
 */

(function fixStatementDates() {
  console.log('🔧 Starting statement date fix migration...');
  
  // Read all statements from localStorage
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  console.log(`📊 Found ${statements.length} statements in localStorage`);
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  // Process each statement
  statements.forEach((stmt, index) => {
    // Check if statement has the nested content structure
    const content = stmt.content?.content || stmt.content;
    
    if (!content) {
      console.log(`⚠️ Statement ${index + 1} (${stmt.bankCode}): Missing content, skipping`);
      skippedCount++;
      return;
    }
    
    // Get current statement_date
    const currentDate = content.summary?.statement_date || content.statement_date;
    
    // Check if date is wrong (uses 20251025 or similar recent date)
    const currentDateYear = currentDate ? currentDate.substring(0, 4) : '';
    const currentDateMonth = currentDate ? currentDate.substring(4, 6) : '';
    
    // If date is October 2025 (202510) and we have 3 months of data, it's likely wrong
    if (currentDateYear === '2025' && currentDateMonth === '10') {
      console.log(`❌ Statement ${index + 1} (${stmt.bankCode}): Date is ${currentDate} (likely wrong)`);
      
      // Try to get date from transactions (oldest transaction date)
      if (content.transactions && content.transactions.length > 0) {
        const oldestTransaction = content.transactions[0];
        const txnDate = oldestTransaction.date;
        
        if (txnDate && txnDate.length === 10) {
          // Transaction date is YYYY-MM-DD format
          const fixedDate = txnDate.replace(/-/g, ''); // Convert to YYYYMMDD
          
          // Update the statement_date
          if (content.summary) {
            content.summary.statement_date = fixedDate;
          } else if (content) {
            content.statement_date = fixedDate;
          }
          
          console.log(`✅ Fixed: ${currentDate} → ${fixedDate} (from transaction ${txnDate})`);
          fixedCount++;
        } else {
          console.log(`⚠️ Could not fix: transaction date format unknown (${txnDate})`);
          skippedCount++;
        }
      } else {
        console.log(`⚠️ Could not fix: no transactions found`);
        skippedCount++;
      }
    } else {
      console.log(`✓ Statement ${index + 1} (${stmt.bankCode}): Date ${currentDate} looks correct`);
      skippedCount++;
    }
  });
  
  // Save updated statements back to localStorage
  if (fixedCount > 0) {
    localStorage.setItem('cardgenius_statements', JSON.stringify(statements));
    console.log(`\n✅ Fixed ${fixedCount} statements`);
    console.log(`⚠️ Skipped ${skippedCount} statements`);
    console.log(`\n🎉 Migration complete! Please refresh the dashboard to see corrected dates.`);
  } else {
    console.log(`\n✓ No statements needed fixing`);
  }
  
  // Return summary
  return {
    total: statements.length,
    fixed: fixedCount,
    skipped: skippedCount
  };
})();

