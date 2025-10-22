#!/usr/bin/env node

/**
 * Dynamic User Details Form Generator
 * Generates forms based on detected banks and their requirements
 * Usage: node scripts/dynamic-form-generator.js
 */

const fs = require('fs');
const path = require('path');

// Bank-specific requirements
const BANK_REQUIREMENTS = {
  'hsbc': {
    name: 'HSBC India',
    fields: ['name', 'dob', 'card_last6'],
    fieldLabels: {
      name: 'Full Name (as on card)',
      dob: 'Date of Birth (DDMMYYYY)',
      card_last6: 'HSBC Card Last 6 Digits'
    },
    fieldHints: {
      name: 'Enter your full name as it appears on your HSBC card',
      dob: 'Format: DDMMYYYY (e.g., 15101985)',
      card_last6: 'Last 6 digits of your HSBC card number'
    }
  },
  'hdfc': {
    name: 'HDFC Bank',
    fields: ['name', 'dob'],
    fieldLabels: {
      name: 'Full Name (as on card)',
      dob: 'Date of Birth (DDMMYYYY)'
    },
    fieldHints: {
      name: 'Enter your full name as it appears on your HDFC card',
      dob: 'Format: DDMMYYYY (e.g., 15101985)'
    }
  },
  'axis': {
    name: 'Axis Bank',
    fields: ['name', 'dob'],
    fieldLabels: {
      name: 'Full Name (as on card)',
      dob: 'Date of Birth (DDMMYYYY)'
    },
    fieldHints: {
      name: 'Enter your full name as it appears on your Axis card',
      dob: 'Format: DDMMYYYY (e.g., 15101985)'
    }
  },
  'rbl': {
    name: 'RBL Bank',
    fields: ['name', 'dob'],
    fieldLabels: {
      name: 'Full Name (as on card)',
      dob: 'Date of Birth (DDMMYYYY)'
    },
    fieldHints: {
      name: 'Enter your full name as it appears on your RBL card',
      dob: 'Format: DDMMYYYY (e.g., 15101985)'
    }
  },
  'idfc': {
    name: 'IDFC First Bank',
    fields: ['dob'],
    fieldLabels: {
      dob: 'Date of Birth (DDMMYYYY)'
    },
    fieldHints: {
      dob: 'Format: DDMMYYYY (e.g., 15101985)'
    }
  },
  'sbi': {
    name: 'State Bank of India',
    fields: ['dob', 'card_last4'],
    fieldLabels: {
      dob: 'Date of Birth (DDMMYYYY)',
      card_last4: 'SBI Card Last 4 Digits'
    },
    fieldHints: {
      dob: 'Format: DDMMYYYY (e.g., 15101985)',
      card_last4: 'Last 4 digits of your SBI card number'
    }
  },
  'yes': {
    name: 'Yes Bank',
    fields: ['name', 'dob'],
    fieldLabels: {
      name: 'Full Name (as on card)',
      dob: 'Date of Birth (DDMMYYYY)'
    },
    fieldHints: {
      name: 'Enter your full name as it appears on your Yes Bank card',
      dob: 'Format: DDMMYYYY (e.g., 15101985)'
    }
  },
  'icici': {
    name: 'ICICI Bank',
    fields: ['name', 'dob'],
    fieldLabels: {
      name: 'Full Name (as on card)',
      dob: 'Date of Birth (DDMMYYYY)'
    },
    fieldHints: {
      name: 'Enter your full name as it appears on your ICICI card',
      dob: 'Format: DDMMYYYY (e.g., 15101985)'
    }
  },
  'indusind': {
    name: 'IndusInd Bank',
    fields: ['name', 'dob'],
    fieldLabels: {
      name: 'Full Name (as on card)',
      dob: 'Date of Birth (DDMMYYYY)'
    },
    fieldHints: {
      name: 'Enter your full name as it appears on your IndusInd card',
      dob: 'Format: DDMMYYYY (e.g., 15101985)'
    }
  }
};

// Mock detected statements (replace with actual Gmail sync results)
const DETECTED_STATEMENTS = [
  { bank: 'hsbc', filename: '20251008.pdf', messageId: 'hsbc-msg-1' },
  { bank: 'hdfc', filename: '5522XXXXXXXXXX59_14-10-2025_588.pdf', messageId: 'hdfc-msg-1' },
  { bank: 'axis', filename: 'Credit Card Statement.pdf', messageId: 'axis-msg-1' },
  { bank: 'rbl', filename: 'xxxx-xxxx-xx-xxxx01_105603042_22-09-2025.pdf', messageId: 'rbl-msg-1' },
  { bank: 'idfc', filename: '40000001396045_21092025_192214583.pdf', messageId: 'idfc-msg-1' },
  { bank: 'sbi', filename: '8796326479959131_17092025.pdf', messageId: 'sbi-msg-1' },
  { bank: 'yes', filename: '122009_1005060000047727-691.pdf', messageId: 'yes-msg-1' },
];

function generateDynamicForm(statements) {
  console.log('🎯 Dynamic User Details Form Generator');
  console.log('=====================================');
  
  // Analyze which banks are present
  const banksPresent = [...new Set(statements.map(s => s.bank))];
  console.log(`📊 Detected ${banksPresent.length} banks: ${banksPresent.map(b => b.toUpperCase()).join(', ')}`);
  
  // Collect all required fields
  const requiredFields = new Set();
  const bankFieldMap = {};
  
  banksPresent.forEach(bank => {
    const requirements = BANK_REQUIREMENTS[bank];
    if (requirements) {
      requirements.fields.forEach(field => {
        requiredFields.add(field);
        if (!bankFieldMap[field]) {
          bankFieldMap[field] = [];
        }
        bankFieldMap[field].push(bank);
      });
    }
  });
  
  console.log(`\n📋 Required fields: ${Array.from(requiredFields).join(', ')}`);
  
  // Generate form structure
  const formStructure = {
    title: 'Credit Card Statement Processing',
    subtitle: 'Please provide the following information for your detected statements:',
    fields: [],
    banks: banksPresent.map(bank => ({
      code: bank,
      name: BANK_REQUIREMENTS[bank]?.name || bank.toUpperCase(),
      statements: statements.filter(s => s.bank === bank).length
    }))
  };
  
  // Add fields based on requirements
  Array.from(requiredFields).forEach(field => {
    const banksUsingField = bankFieldMap[field];
    const fieldInfo = {
      name: field,
      label: getFieldLabel(field, banksUsingField),
      hint: getFieldHint(field, banksUsingField),
      required: true,
      banks: banksUsingField,
      type: getFieldType(field)
    };
    
    formStructure.fields.push(fieldInfo);
  });
  
  return formStructure;
}

function getFieldLabel(field, banks) {
  const bankNames = banks.map(b => BANK_REQUIREMENTS[b]?.name || b.toUpperCase()).join(', ');
  
  switch (field) {
    case 'name':
      return `Full Name (as on card) - Required for: ${bankNames}`;
    case 'dob':
      return `Date of Birth (DDMMYYYY) - Required for: ${bankNames}`;
    case 'card_last4':
      return `Card Last 4 Digits - Required for: ${bankNames}`;
    case 'card_last6':
      return `Card Last 6 Digits - Required for: ${bankNames}`;
    default:
      return field;
  }
}

function getFieldHint(field, banks) {
  switch (field) {
    case 'name':
      return 'Enter your full name exactly as it appears on your credit card';
    case 'dob':
      return 'Format: DDMMYYYY (e.g., 15101985 for 15th October 1985)';
    case 'card_last4':
      return 'Last 4 digits of your credit card number';
    case 'card_last6':
      return 'Last 6 digits of your credit card number (required for HSBC)';
    default:
      return '';
  }
}

function getFieldType(field) {
  switch (field) {
    case 'name':
      return 'text';
    case 'dob':
      return 'text';
    case 'card_last4':
      return 'text';
    case 'card_last6':
      return 'text';
    default:
      return 'text';
  }
}

function generatePasswordAttempts(userDetails, bankCode) {
  const attempts = [];
  const bankRules = BANK_REQUIREMENTS[bankCode];
  
  if (!bankRules) {
    console.log(`❌ No rules defined for bank: ${bankCode}`);
    return attempts;
  }
  
  console.log(`🔐 Generating passwords for ${bankCode.toUpperCase()}`);
  
  switch (bankCode) {
    case 'hsbc':
      if (userDetails.name && userDetails.dob && userDetails.card_last6) {
        const dob = userDetails.dob;
        const cardLast6 = userDetails.card_last6;
        
        // DDMMYY format: DDMM + YY (last 2 digits of year)
        const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // 151085
        
        attempts.push({ password: dob, source: 'dob-full' });
        attempts.push({ password: dob.substring(0, 6), source: 'dob-yy' });
        attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' });
        attempts.push({ password: cardLast6, source: 'card-last6' });
        attempts.push({ password: ddmmyy + cardLast6, source: 'ddmmyy+card6' });
        
        console.log(`   Generated ${attempts.length} HSBC password attempts`);
      }
      break;
      
    case 'hdfc':
      if (userDetails.name && userDetails.dob) {
        const name4 = userDetails.name.substring(0, 4).toUpperCase();
        const dob = userDetails.dob;
        
        attempts.push({ password: name4 + dob, source: 'name4+dob' });
        attempts.push({ password: name4 + dob.substring(0, 4), source: 'name4+ddmm' });
        
        console.log(`   Generated ${attempts.length} HDFC password attempts`);
      }
      break;
      
    case 'axis':
      if (userDetails.name && userDetails.dob) {
        const name4 = userDetails.name.substring(0, 4).toUpperCase();
        const dob = userDetails.dob;
        
        attempts.push({ password: name4 + dob.substring(0, 4), source: 'name4+ddmm' });
        
        console.log(`   Generated ${attempts.length} Axis password attempts`);
      }
      break;
      
    case 'rbl':
      if (userDetails.name && userDetails.dob) {
        const name4 = userDetails.name.substring(0, 4).toUpperCase();
        const dob = userDetails.dob;
        
        // RBL uses: First 4 letters of name + DDMMYY
        const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // DDMM + YY
        attempts.push({ password: name4 + ddmmyy, source: 'name4+ddmmyy' });
        
        // Also try other variations
        attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' });
        attempts.push({ password: dob, source: 'dob-full' });
        
        console.log(`   Generated ${attempts.length} RBL password attempts`);
      }
      break;
      
    case 'idfc':
      if (userDetails.dob) {
        const dob = userDetails.dob;
        
        attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' });
        
        console.log(`   Generated ${attempts.length} IDFC password attempts`);
      }
      break;
      
    case 'sbi':
      if (userDetails.dob && userDetails.card_last4) {
        const dob = userDetails.dob;
        const cardLast4 = userDetails.card_last4;
        
        attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' });
        attempts.push({ password: dob.substring(0, 4) + cardLast4, source: 'ddmm+card4' });
        
        console.log(`   Generated ${attempts.length} SBI password attempts`);
      }
      break;
      
    case 'yes':
      if (userDetails.name && userDetails.dob) {
        const name4 = userDetails.name.substring(0, 4).toUpperCase();
        const dob = userDetails.dob;
        
        attempts.push({ password: name4 + dob.substring(0, 4), source: 'name4+ddmm' });
        
        console.log(`   Generated ${attempts.length} Yes Bank password attempts`);
      }
      break;
      
    case 'icici':
      if (userDetails.name && userDetails.dob) {
        const name4 = userDetails.name.substring(0, 4).toUpperCase();
        const dob = userDetails.dob;
        
        attempts.push({ password: name4 + dob.substring(0, 4), source: 'name4+ddmm' });
        
        console.log(`   Generated ${attempts.length} ICICI password attempts`);
      }
      break;
      
    case 'indusind':
      if (userDetails.name && userDetails.dob) {
        const name4 = userDetails.name.substring(0, 4).toUpperCase();
        const dob = userDetails.dob;
        
        attempts.push({ password: name4 + dob.substring(0, 4), source: 'name4+ddmm' });
        
        console.log(`   Generated ${attempts.length} IndusInd password attempts`);
      }
      break;
  }
  
  return attempts;
}

function createInteractiveForm() {
  const formStructure = generateDynamicForm(DETECTED_STATEMENTS);
  
  console.log(`\n📝 ${formStructure.title}`);
  console.log('='.repeat(formStructure.title.length));
  console.log(formStructure.subtitle);
  
  console.log(`\n🏦 Detected Banks:`);
  formStructure.banks.forEach(bank => {
    console.log(`   • ${bank.name}: ${bank.statements} statement(s)`);
  });
  
  console.log(`\n📋 Required Information:`);
  formStructure.fields.forEach((field, index) => {
    console.log(`\n${index + 1}. ${field.label}`);
    console.log(`   💡 ${field.hint}`);
    console.log(`   🏦 Used by: ${field.banks.map(b => BANK_REQUIREMENTS[b]?.name || b.toUpperCase()).join(', ')}`);
  });
  
  console.log(`\n💡 Example Form Data:`);
  console.log(`   Name: Mohsin`);
  console.log(`   DOB: 15101985`);
  console.log(`   HSBC Card Last 6: 404400`);
  console.log(`   SBI Card Last 4: 9131`);
  
  return formStructure;
}

function generateFormHTML(formStructure) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${formStructure.title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-weight: bold; margin-bottom: 5px; }
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .hint { font-size: 12px; color: #666; margin-top: 5px; }
        .banks { font-size: 12px; color: #888; margin-top: 2px; }
        .required { color: red; }
        button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <h1>${formStructure.title}</h1>
    <p>${formStructure.subtitle}</p>
    
    <div class="banks">
        <strong>Detected Banks:</strong>
        ${formStructure.banks.map(bank => `${bank.name} (${bank.statements} statement(s))`).join(', ')}
    </div>
    
    <form id="userDetailsForm">
        ${formStructure.fields.map(field => `
            <div class="form-group">
                <label for="${field.name}">
                    ${field.label} <span class="required">*</span>
                </label>
                <input type="${field.type}" id="${field.name}" name="${field.name}" required>
                <div class="hint">${field.hint}</div>
                <div class="banks">Used by: ${field.banks.map(b => BANK_REQUIREMENTS[b]?.name || b.toUpperCase()).join(', ')}</div>
            </div>
        `).join('')}
        
        <button type="submit">Process Statements</button>
    </form>
    
    <script>
        document.getElementById('userDetailsForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            console.log('Form submitted with data:', data);
            alert('Form submitted! Check console for data.');
        });
    </script>
</body>
</html>`;
  
  return html;
}

async function main() {
  console.log('🚀 Dynamic Form Generator');
  console.log('========================');
  
  // Generate form structure
  const formStructure = createInteractiveForm();
  
  // Generate HTML form
  const html = generateFormHTML(formStructure);
  
  // Save HTML form
  const htmlPath = path.join(process.cwd(), 'temp-decrypted', 'dynamic-form.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`\n💾 HTML form saved to: ${htmlPath}`);
  
  // Test password generation with sample data
  console.log(`\n🧪 Testing Password Generation:`);
  console.log('================================');
  
  const sampleUserDetails = {
    name: 'Mohsin',
    dob: '15101985',
    card_last6: '404400',
    card_last4: '9131'
  };
  
  const banksPresent = [...new Set(DETECTED_STATEMENTS.map(s => s.bank))];
  banksPresent.forEach(bank => {
    const attempts = generatePasswordAttempts(sampleUserDetails, bank);
    if (attempts.length > 0) {
      console.log(`\n${bank.toUpperCase()} passwords:`);
      attempts.forEach((attempt, i) => {
        console.log(`   ${i + 1}. "${attempt.password}" (${attempt.source})`);
      });
    }
  });
  
  console.log(`\n✅ Dynamic form system ready!`);
  console.log(`📝 Open ${htmlPath} in your browser to see the form`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateDynamicForm, generatePasswordAttempts, BANK_REQUIREMENTS };
