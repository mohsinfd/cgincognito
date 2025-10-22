/**
 * Quick test script for V2 API without Gmail sync
 * Tests the JSON schema fix with a single statement
 */

const fs = require('fs');
const path = require('path');

async function testV2API() {
  console.log('🧪 Quick V2 API Test - Testing JSON Schema Fix');
  console.log('='.repeat(60));

  try {
    // Test with a single statement (simulate what V2 API would receive)
    const testStatement = {
      bank_code: 'hdfc',
      attachment: {
        filename: 'test-statement.pdf',
        attachmentId: 'test-attachment-id'
      },
      emailBody: 'Test email body for HDFC statement'
    };

    const userDetails = {
      name: 'MOHSIN DINGANKAR',
      dob: '15101985',
      cards: [
        {
          bank_code: 'hdfc',
          last4: '2025',
          last6: '',
          status: 'active'
        }
      ]
    };

    console.log('📄 Testing with statement:', testStatement.bank_code);
    console.log('👤 User details:', userDetails.name, userDetails.dob);
    console.log('💳 Cards:', userDetails.cards.length);

    // Call V2 API directly
    const response = await fetch('http://localhost:3000/api/gmail/process-statements-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statements: [testStatement],
        userDetails: userDetails
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      return;
    }

    const result = await response.json();
    
    console.log('✅ API Response received');
    console.log('📊 Result summary:', {
      success: result.success,
      processedCount: result.processedCount,
      errorCount: result.errorCount,
      totalStatements: result.totalStatements
    });

    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      console.log('🔍 First result:', {
        bankCode: firstResult.bank_code,
        success: firstResult.success,
        transactionCount: firstResult.transactionCount,
        error: firstResult.error
      });

      if (firstResult.success && firstResult.parsedData) {
        console.log('🎉 SUCCESS! Statement parsed successfully');
        console.log('📈 Transaction count:', firstResult.transactionCount);
        console.log('🏦 Bank:', firstResult.parsedData.bank);
        console.log('💳 Card:', firstResult.parsedData.card_details?.card_type);
        
        if (firstResult.parsedData.transactions && firstResult.parsedData.transactions.length > 0) {
          console.log('🛒 Sample transactions:');
          firstResult.parsedData.transactions.slice(0, 3).forEach((txn, i) => {
            console.log(`  ${i + 1}. ${txn.description} - ₹${txn.amount} (${txn.category || 'uncategorized'})`);
          });
        }
      } else {
        console.log('❌ FAILED:', firstResult.error);
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testV2API().then(() => {
  console.log('\n🏁 Test completed');
}).catch(console.error);
