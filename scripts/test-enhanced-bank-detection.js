#!/usr/bin/env node

/**
 * Test script to verify improved bank detection
 * Tests both from field and subject line patterns
 */

// Sample test cases based on your terminal logs
const testCases = [
  {
    from: 'noreply@axisbank.com',
    subject: 'Your Axis Bank Magnus Credit Card ending XX83 - October 2025',
    expected: 'axis',
    description: 'Axis Magnus - from field'
  },
  {
    from: 'statements@axisbank.com',
    subject: 'Flipkart Axis Bank Credit Card Statement ending XX31 - October 2025',
    expected: 'axis',
    description: 'Flipkart Axis - from field'
  },
  {
    from: 'noreply@someotherdomain.com',
    subject: 'Your Axis Bank Magnus Credit Card ending XX83 - September 2025',
    expected: 'axis',
    description: 'Axis Magnus - subject pattern (magnus)'
  },
  {
    from: 'noreply@someotherdomain.com',
    subject: 'Flipkart Axis Bank Credit Card Statement ending XX31 - September 2025',
    expected: 'axis',
    description: 'Flipkart Axis - subject pattern (flipkart.*axis)'
  },
  {
    from: 'noreply@hdfcbank.com',
    subject: 'Your HDFC Bank - Regalia Gold Credit Card Statement - October-2025',
    expected: 'hdfc',
    description: 'HDFC Regalia - from field'
  },
  {
    from: 'noreply@someotherdomain.com',
    subject: 'Your HDFC Bank - Regalia Gold Credit Card Statement - October-2025',
    expected: 'hdfc',
    description: 'HDFC Regalia - subject pattern (hdfc.*regalia)'
  },
  {
    from: 'noreply@sbicard.com',
    subject: 'Your CASHBACK SBI Card Monthly Statement -Oct 2025',
    expected: 'sbi',
    description: 'SBI Cashback - from field'
  },
  {
    from: 'noreply@someotherdomain.com',
    subject: 'Your CASHBACK SBI Card Monthly Statement -Oct 2025',
    expected: 'sbi',
    description: 'SBI Cashback - subject pattern (sbi.*cashback)'
  },
  {
    from: 'noreply@yesbank.com',
    subject: 'Your YES_BANK_Klick Credit Card E-Statement',
    expected: 'yes',
    description: 'YES Klick - from field'
  },
  {
    from: 'noreply@someotherdomain.com',
    subject: 'Your YES_BANK_Klick Credit Card E-Statement',
    expected: 'yes',
    description: 'YES Klick - subject pattern (yes.*klick)'
  },
  {
    from: 'noreply@unknownbank.com',
    subject: 'Some random email',
    expected: null,
    description: 'Unknown bank - should return null'
  }
];

// Simulate the detectBankFromEmail function
function detectBankFromEmail(from, subject) {
  const fromLower = from.toLowerCase();
  const subjectLower = subject?.toLowerCase() || '';
  
  const bankPatterns = [
    { pattern: 'hdfcbank', code: 'hdfc' },
    { pattern: 'sbicard', code: 'sbi' },
    { pattern: 'icicibank', code: 'icici' },
    { pattern: 'axisbank', code: 'axis' },
    { pattern: 'kotak', code: 'kotak' },
    { pattern: 'hsbc.co.in', code: 'hsbc' },
    { pattern: 'sc.com', code: 'sc' },
    { pattern: 'citibank', code: 'citi' },
    { pattern: 'indusind', code: 'indusind' },
    { pattern: 'yesbank', code: 'yes' },
    { pattern: 'rblbank', code: 'rbl' },
    { pattern: 'idfcfirstbank', code: 'idfc' },
    { pattern: 'federalbank', code: 'federal' },
    { pattern: 'onecard', code: 'onecard' },
    { pattern: 'jupiter', code: 'jupiter' },
    // Subject line patterns for better detection
    { pattern: 'magnus', code: 'axis', checkSubject: true },
    { pattern: 'flipkart.*axis', code: 'axis', checkSubject: true },
    { pattern: 'axis.*magnus', code: 'axis', checkSubject: true },
    { pattern: 'axis.*flipkart', code: 'axis', checkSubject: true },
    { pattern: 'hdfc.*regalia', code: 'hdfc', checkSubject: true },
    { pattern: 'sbi.*cashback', code: 'sbi', checkSubject: true },
    { pattern: 'cashback.*sbi', code: 'sbi', checkSubject: true },
    { pattern: 'yes.*klick', code: 'yes', checkSubject: true },
  ];

  for (const { pattern, code, checkSubject } of bankPatterns) {
    const textToCheck = checkSubject ? subjectLower : fromLower;
    if (pattern.includes('.*')) {
      // Use regex for patterns with wildcards
      const regex = new RegExp(pattern, 'i');
      if (regex.test(textToCheck)) {
        return code;
      }
    } else {
      // Use simple includes for exact matches
      if (textToCheck.includes(pattern)) {
        return code;
      }
    }
  }

  return null;
}

// Run tests
console.log('🧪 Testing Enhanced Bank Detection...');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = detectBankFromEmail(testCase.from, testCase.subject);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
    console.log(`   From: ${testCase.from}`);
    console.log(`   Subject: ${testCase.subject}`);
    console.log(`   Result: ${result}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   From: ${testCase.from}`);
    console.log(`   Subject: ${testCase.subject}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
  }
  console.log('');
});

console.log('='.repeat(60));
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! Enhanced bank detection is working correctly.');
} else {
  console.log('⚠️ Some tests failed. Bank detection needs refinement.');
}

console.log('');
console.log('🔍 EXPECTED IMPACT:');
console.log('  • Should detect more Axis Bank statements');
console.log('  • Should catch Magnus and Flipkart cards even with different from domains');
console.log('  • Should improve overall statement detection rate');
console.log('  • Should help reach the expected 24 statements (8 cards × 3 months)');
