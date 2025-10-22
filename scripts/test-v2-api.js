#!/usr/bin/env node

/**
 * Test V2 API with provided curl payload
 * Usage: node scripts/test-v2-api.js
 */

const fs = require('fs');
const path = require('path');

// Your curl payload data
const CURL_PAYLOAD = {
  // NOTE: Do not commit real tokens. Use a placeholder and pass via env if needed.
  "accessToken": "ACCESS_TOKEN_PLACEHOLDER",
  "statements": [
    {
      "bank_code": "hdfc",
      "message_id": "199e7354e5e354b9",
      "subject": "Your HDFC Bank - Regalia Gold Credit Card Statement - October-2025",
      "from": "HDFC Bank Cards <Emailstatements.cards@hdfcbank.net>",
      "date": "Wed, 15 Oct 2025 09:30:51 +0000",
      "attachment": {
        "filename": "5522XXXXXXXXXX59_14-10-2025_588.pdf",
        "size": 263921,
        "attachment_id": "ANGjdJ_CCsIAhisoKfGtAEWK9VGXPHuuI5kDxLNFGwcUlAw1cYC7Fs2PNh2M1dBHhOnxQYt3sueeAfuKZjWAzeyX82HsKexcFZdE_0laPZzu6BevWwrbWAU8CiLUoJzLRYqClKwyzpX_SZOMW0xPSuF7dwaBZ3eGdi8tn6i6X_Yxthu5wukMYFEUB1vYWWk-NoPFSMCCi44QL18qaA36YMKm31P8LjWNuyCofQaXAo8GNPQPSLct8xUNYtA8Hsw3O4erPOUM025CqMjCavPDQWZ6Bw1LTGckuCh3MCmVpsQuNJGV5SabWDHChydvHZjFPkl70dT-wP30Rp9s0MweBa_IkTHsTg2Dahwaf86i6bkM_5MzaeTvbstXnUnbvlY5Iw5XdqRYkATXYJN0ICmp"
      },
      "passwordRequirement": {
        "fields": ["dob"],
        "format": "Password protected (format not detected)",
        "instructions": "HDFC statements are typically protected with your date of birth (DDMMYYYY format).",
        "confidence": "low",
        "source": "regex",
        "bankCode": "hdfc"
      }
    }
  ],
  "userDetails": {
    "name": "MOHSIN DINGANKAR",
    "dob": "15101985",
    "cardNumbers": ["0359", "2866", "9907", "1380", "4158", "8283", "3101", "404400", "9531", "2068"]
  }
};

async function testV2API() {
  console.log('🧪 Testing V2 API with curl payload');
  console.log('=====================================');
  
  try {
    const response = await fetch('http://localhost:3000/api/gmail/process-statements-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify(CURL_PAYLOAD)
    });
    
    const result = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ V2 API Success!');
      console.log(`📈 Version: ${result.version}`);
      console.log(`🔧 Method: ${result.method}`);
      console.log(`📊 Processed: ${result.processed_count}`);
      console.log(`✅ Success: ${result.success_count}`);
      console.log(`❌ Failed: ${result.error_count}`);
      console.log(`📈 Success Rate: ${result.summary?.success_rate}`);
      
      if (result.statements && result.statements.length > 0) {
        console.log('\n📋 Statement Results:');
        result.statements.forEach((stmt, index) => {
          console.log(`\n${index + 1}. ${stmt.bank_code.toUpperCase()}: ${stmt.attachment.filename}`);
          console.log(`   Success: ${stmt.processing_result?.success}`);
          if (stmt.processing_result?.success) {
            console.log(`   Password: ${stmt.processing_result.passwordUsed}`);
            console.log(`   Transactions: ${stmt.processing_result.transactionCount}`);
          } else {
            console.log(`   Error: ${stmt.processing_result?.error}`);
            console.log(`   Attempts: ${stmt.processing_result?.attempts}`);
          }
        });
      }
    } else {
      console.log('❌ V2 API Failed!');
      console.log(`Error: ${result.error}`);
      console.log(`Message: ${result.message}`);
      
      if (result.missingFields) {
        console.log('Missing Fields:');
        Object.entries(result.missingFields).forEach(([bank, fields]) => {
          console.log(`  ${bank}: ${fields.join(', ')}`);
        });
      }
    }
    
    // Save full response for debugging
    const outputPath = path.join(process.cwd(), 'temp-decrypted', `v2-api-test-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full response saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/test-env');
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Server not running. Please start with: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🚀 V2 API Test Script');
  console.log('=====================');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await testV2API();
}

if (require.main === module) {
  main().catch(console.error);
}
