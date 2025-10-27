/**
 * Diagnose SBI Zero Transactions Issue
 * 
 * Run this in browser console to analyze SBI statements
 */

(function diagnoseSBI() {
  console.log('🔍 Diagnosing SBI Zero Transactions Issue...\n');
  
  const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
  
  const sbiStatements = statements.filter(s => s.bankCode === 'sbi');
  
  console.log(`📊 Found ${sbiStatements.length} SBI statements\n`);
  
  if (sbiStatements.length === 0) {
    console.log('❌ No SBI statements found in localStorage');
    return;
  }
  
  sbiStatements.forEach((stmt, idx) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Statement ${idx + 1}:`);
    console.log(`  ID: ${stmt.id || stmt.message_id || 'N/A'}`);
    console.log(`  Bank: ${stmt.bankCode}`);
    console.log(`  Date: ${stmt.content?.content?.summary?.statement_date || stmt.content?.summary?.statement_date || 'Unknown'}`);
    console.log(`  Subject: ${stmt.subject || 'N/A'}`);
    console.log(`  From: ${stmt.from || 'N/A'}`);
    
    // Check content structure
    console.log(`\n📦 Content Structure:`);
    console.log(`  Has content: ${!!stmt.content}`);
    console.log(`  Has nested content: ${!!stmt.content?.content}`);
    console.log(`  Has processing_result: ${!!stmt.processing_result}`);
    
    if (stmt.processing_result) {
      console.log(`  Processing success: ${stmt.processing_result.success}`);
      console.log(`  Has parsedData: ${!!stmt.processing_result.parsedData}`);
    }
    
    // Check transactions
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    
    console.log(`\n💳 Transactions:`);
    console.log(`  Total: ${transactions.length}`);
    
    if (transactions.length > 0) {
      console.log(`  First 3 transactions:`);
      transactions.slice(0, 3).forEach((txn, txnIdx) => {
        console.log(`    ${txnIdx + 1}. [${txn.type}] ${txn.date}: ${txn.description} - ₹${txn.amount}`);
      });
      
      const debits = transactions.filter(t => {
        const type = (t.type || '').toString().toLowerCase();
        return type === 'dr' || type === 'debit';
      });
      
      const credits = transactions.filter(t => {
        const type = (t.type || '').toString().toLowerCase();
        return type === 'cr' || type === 'credit';
      });
      
      console.log(`\n  Debits: ${debits.length}`);
      console.log(`  Credits: ${credits.length}`);
      
      if (debits.length === 0 && credits.length > 0) {
        console.log(`  ⚠️  ISSUE: Only credit transactions found!`);
        console.log(`  This could mean:`);
        console.log(`    1. Statement only contains payments (unlikely)`);
        console.log(`    2. LLM misclassified all debits as credits`);
        console.log(`    3. PDF didn't contain proper transaction data`);
      }
      
      if (debits.length === 0 && credits.length === 0) {
        console.log(`  ⚠️  ISSUE: Transactions found but no Dr/Cr types!`);
        console.log(`  Transaction types seen:`, [...new Set(transactions.map(t => t.type))]);
      }
    } else {
      console.log(`  ❌ NO TRANSACTIONS FOUND`);
      console.log(`\n🔍 Checking raw data structure:`);
      
      if (stmt.content) {
        console.log(`  Content keys:`, Object.keys(stmt.content));
        if (stmt.content.content) {
          console.log(`  Nested content keys:`, Object.keys(stmt.content.content));
        }
      }
      
      if (stmt.processing_result?.parsedData) {
        console.log(`  ParsedData keys:`, Object.keys(stmt.processing_result.parsedData));
        console.log(`  Transactions in parsedData:`, stmt.processing_result.parsedData.transactions?.length || 0);
      }
      
      console.log(`\n  Raw content preview (first 500 chars):`);
      console.log(JSON.stringify(stmt.content, null, 2).substring(0, 500));
    }
  });
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary:`);
  
  const totalTransactions = sbiStatements.reduce((sum, stmt) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    return sum + transactions.length;
  }, 0);
  
  const totalDebits = sbiStatements.reduce((sum, stmt) => {
    const transactions = stmt.content?.content?.transactions || 
                        stmt.content?.transactions || 
                        stmt.transactions || [];
    return sum + transactions.filter(t => {
      const type = (t.type || '').toString().toLowerCase();
      return type === 'dr' || type === 'debit';
    }).length;
  }, 0);
  
  console.log(`  Total statements: ${sbiStatements.length}`);
  console.log(`  Total transactions: ${totalTransactions}`);
  console.log(`  Total debits: ${totalDebits}`);
  
  if (totalDebits === 0) {
    console.log(`\n❌ ROOT CAUSE: No debit transactions extracted from SBI statements`);
    console.log(`\n💡 Possible reasons:`);
    console.log(`  1. SBI PDFs are password-protected and decryption failed`);
    console.log(`  2. SBI statement format is different and LLM couldn't parse`);
    console.log(`  3. BoostScore API returned empty transactions for SBI`);
    console.log(`  4. LLM prompt instructions were ignored for SBI specifically`);
    console.log(`\n🔧 Next steps:`);
    console.log(`  1. Check BoostScore API response for SBI`);
    console.log(`  2. Check if SBI PDFs require password`);
    console.log(`  3. Manually test one SBI statement upload`);
  }
  
  return {
    statements: sbiStatements.length,
    totalTransactions,
    totalDebits,
    details: sbiStatements.map(stmt => ({
      id: stmt.id || stmt.message_id,
      date: stmt.content?.content?.summary?.statement_date || stmt.content?.summary?.statement_date,
      transactions: (stmt.content?.content?.transactions || stmt.content?.transactions || stmt.transactions || []).length,
      debits: (stmt.content?.content?.transactions || stmt.content?.transactions || stmt.transactions || [])
        .filter(t => ((t.type || '').toString().toLowerCase()) === 'dr' || 
                     ((t.type || '').toString().toLowerCase()) === 'debit').length
    }))
  };
})();

