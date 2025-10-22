/**
 * Password Pattern Library
 * Regex patterns for extracting password requirements from bank emails
 */

export type PasswordField = 'name' | 'dob' | 'card_last6' | 'card_last4' | 'card_last2' | 'pan' | 'mobile' | 'customer_id';

export const PASSWORD_PATTERNS = {
  // Date of Birth patterns
  dob_ddmmyyyy: /date of birth|DOB.*DDMMYYYY|birth date.*8 digit|DDMMYYYY.*birth|birth.*DDMMYYYY/i,
  dob_ddmmyy: /DDMMYY|6 digit.*birth|birth.*6 digit|DDMMYY.*birth/i,
  dob_ddmm: /DDMM(?!YY)|birth.*4 digit|4 digit.*birth|dd\/mm.*format|date.*month.*birth/i,
  
  // Card number patterns
  card_last6: /last 6 digits|last six digits|6 digit.*card|card.*6 digit/i,
  card_last4: /last 4 digits|last four digits|card.*\*{4}|4 digit.*card|card.*4 digit/i,
  card_last2: /last 2 digits|last two digits|2 digit.*card|card.*2 digit/i,
  
  // Other identity patterns
  pan: /PAN card|PAN number|permanent account number/i,
  mobile: /mobile number|registered mobile|phone number/i,
  name: /name.*card|card.*name|cardholder name|account holder name/i,
  
  // Combined patterns
  dob_plus_card: /DDMM.*last.*digit|birth.*\+.*card|DOB.*card|card.*DOB/i,
  dob_plus_last4: /DDMMYYYY.*last.*4|birth.*last.*4|DOB.*last.*4/i,
  name_plus_dob: /name.*birth|birth.*name|name.*DOB|DOB.*name/i,
  
  // Bank-specific patterns
  hdfc_name_card: /first.*four.*letter.*card.*last.*four.*digit|four.*letter.*four.*digit|first.*four.*letter.*embossed|last.*four.*digit.*card/i,
  hdfc_name_dob: /first.*four.*letter.*date.*month.*birth|four.*letter.*ddmm|dd\/mm.*format|date.*month.*birth|first.*four.*letter.*followed.*date/i,
  hdfc_pattern: /DDMMYYYY|date.*birth.*8/i, // Fallback for older DOB-only
  sbi_pattern: /DDMMYYYY.*last.*4.*digit|date.*birth.*last.*4.*digit|dob.*last.*4.*digit/i,
  icici_pattern: /DDMM.*card|birth.*card/i,
  icici_name_dob_lower: /first\s*four\s*letters.*name.*ddmm.*lower\s*case|password.*lower\s*case.*ddmm|lower\s*case.*ddmm/i,
  axis_pattern: /DOB|date.*birth/i,
  axis_name_dob: /first\s*four\s*letters.*name.*ddmm|first\s*4\s*letters.*name.*ddmm|name.*ddmm.*password/i,
  axis_name_card: /first\s*four\s*letters.*name.*last\s*four\s*digits|first\s*4\s*letters.*name.*last\s*4/i,
  kotak_pattern: /mobile.*number|registered.*mobile/i,
  hsbc_pattern: /DDMMYY.*last.*6.*digit|birth.*DDMMYY.*6.*digit|6.*digit.*credit card/i,
  // RBL: commonly DOB (DDMMYYYY) or last 4 digits of card
  rbl_pattern: /(your\s+password\s+is)?\s*(?:date\s+of\s+birth|dob).*|last\s*4\s*digits|last\s*four\s*digits/i,
  // IndusInd: first 4 letters of name (lowercase) + DDMM
  indusind_name_dob_lower: /first\s*4\s*(?:letters|characters).*name.*ddmm.*(lower\s*case|lowercase)|password.*lower\s*case.*ddmm/i,
  
  // AU Bank patterns
  aubank_name_dob: /first\s*4\s*letters\s*of\s*name.*date.*month\s*of\s*birth|first\s*4\s*letters.*name.*\+.*date.*month|name.*date.*month.*birth/i,
  aubank_customer_id: /8[\s\-]*digit[\s\-]*customer[\s\-]*id|8.*digit.*customer.*id|customer.*id.*8.*digit/i,
  
  // Common password instructions
  password_instruction: /password|open|unlock|decrypt|access/i,
  format_instruction: /format|enter|use|type/i,
};

/**
 * Extract required fields from email body text
 */
export function extractFieldsFromText(emailBody: string): PasswordField[] {
  const fields: Set<PasswordField> = new Set();
  const text = emailBody.toLowerCase();
  
  // Check for each pattern
  if (PASSWORD_PATTERNS.dob_ddmmyyyy.test(text) || 
      PASSWORD_PATTERNS.dob_ddmmyy.test(text) || 
      PASSWORD_PATTERNS.dob_ddmm.test(text)) {
    fields.add('dob');
  }
  
  if (PASSWORD_PATTERNS.card_last6.test(text)) {
    fields.add('card_last6');
  }
  
  if (PASSWORD_PATTERNS.card_last4.test(text)) {
    fields.add('card_last4');
  }
  
  if (PASSWORD_PATTERNS.card_last2.test(text)) {
    fields.add('card_last2');
  }
  
  if (PASSWORD_PATTERNS.pan.test(text)) {
    fields.add('pan');
  }
  
  if (PASSWORD_PATTERNS.mobile.test(text)) {
    fields.add('mobile');
  }
  
  if (PASSWORD_PATTERNS.name.test(text)) {
    fields.add('name');
  }
  
  if (PASSWORD_PATTERNS.aubank_customer_id.test(text)) {
    fields.add('customer_id');
  }
  
  return Array.from(fields);
}

/**
 * Extract password format from email body
 */
export function extractPasswordFormat(emailBody: string): string {
  const text = emailBody.toLowerCase();
  
  // Look for specific format mentions
  if (PASSWORD_PATTERNS.dob_ddmmyyyy.test(text)) {
    return 'DDMMYYYY (Date of Birth)';
  }
  
  if (PASSWORD_PATTERNS.dob_ddmmyy.test(text)) {
    return 'DDMMYY (Date of Birth)';
  }
  
  if (PASSWORD_PATTERNS.card_last6.test(text)) {
    return 'Last 6 digits of card';
  }
  
  if (PASSWORD_PATTERNS.card_last4.test(text)) {
    return 'Last 4 digits of card';
  }
  
  if (PASSWORD_PATTERNS.card_last2.test(text)) {
    return 'Last 2 digits of card';
  }
  
  if (PASSWORD_PATTERNS.dob_plus_card.test(text)) {
    return 'DDMM + Last 4 digits';
  }
  
  if (PASSWORD_PATTERNS.dob_plus_last4.test(text)) {
    return 'DDMMYYYY + Last 4 digits';
  }
  
  if (PASSWORD_PATTERNS.pan.test(text)) {
    return 'PAN Card Number';
  }
  
  if (PASSWORD_PATTERNS.mobile.test(text)) {
    return 'Mobile Number';
  }
  
  if (PASSWORD_PATTERNS.aubank_customer_id.test(text)) {
    return '8-digit Customer ID';
  }
  
  if (PASSWORD_PATTERNS.aubank_name_dob.test(text)) {
    return 'First 4 letters of name + DDMM';
  }
  
  return 'Password protected (format not specified)';
}

/**
 * Generate user-friendly instructions based on detected patterns
 */
export function generateInstructions(fields: PasswordField[], format: string): string {
  if (fields.length === 0) {
    return 'This statement appears to be password protected. Please provide your details to help unlock it.';
  }
  
  const fieldNames = {
    name: 'your name (as on card)',
    dob: 'your date of birth',
    card_last6: 'last 6 digits of your card',
    card_last4: 'last 4 digits of your card',
    card_last2: 'last 2 digits of your card',
    pan: 'your PAN card number',
    mobile: 'your mobile number',
    customer_id: 'your 8-digit Customer ID'
  };
  
  const requiredFields = fields.map(field => fieldNames[field]).join(', ');
  
  return `To unlock this statement, please provide ${requiredFields}. Format: ${format}`;
}

/**
 * Bank-specific pattern detection
 */
export function getBankSpecificHints(bankCode: string, emailBody: string): PasswordField[] {
  const text = emailBody.toLowerCase();
  
  switch (bankCode.toLowerCase()) {
    case 'hdfc':
      // Check for name + card pattern first
      if (PASSWORD_PATTERNS.hdfc_name_card.test(text)) {
        return ['name', 'card_last4'];
      }
      // Check for name + DDMM pattern
      if (PASSWORD_PATTERNS.hdfc_name_dob.test(text)) {
        return ['name', 'dob'];
      }
      // Fallback to DOB pattern
      if (PASSWORD_PATTERNS.hdfc_pattern.test(text)) {
        return ['dob'];
      }
      break;
      
    case 'sbi':
      if (PASSWORD_PATTERNS.sbi_pattern.test(text)) {
        return ['card_last4'];
      }
      break;
      
    case 'icici':
      // ICICI: first4(name in lowercase, no spaces/periods) + DDMM
      if (PASSWORD_PATTERNS.icici_name_dob_lower.test(text)) {
        return ['name', 'dob'];
      }
      if (PASSWORD_PATTERNS.icici_pattern.test(text)) {
        return ['dob', 'card_last4'];
      }
      break;
      
    case 'axis':
      // Axis Flipkart/Magnus: first4(NAME)+DDMM or first4(NAME)+LAST4
      if (PASSWORD_PATTERNS.axis_name_dob.test(text)) {
        return ['name', 'dob'];
      }
      if (PASSWORD_PATTERNS.axis_name_card.test(text)) {
        return ['name', 'card_last4'];
      }
      if (PASSWORD_PATTERNS.axis_pattern.test(text)) {
        return ['dob'];
      }
      break;
      
    case 'kotak':
      if (PASSWORD_PATTERNS.kotak_pattern.test(text)) {
        return ['mobile'];
      }
      break;
      
    case 'hsbc':
    case 'sc':
      if (PASSWORD_PATTERNS.hsbc_pattern.test(text)) {
        return ['dob', 'card_last6'];
      }
      break;

    case 'rbl':
      if (PASSWORD_PATTERNS.rbl_pattern.test(text)) {
        return ['dob', 'card_last4'];
      }
      break;

    case 'indusind':
      if (PASSWORD_PATTERNS.indusind_name_dob_lower.test(text)) {
        return ['name', 'dob'];
      }
      break;
      
    case 'aubank':
    case 'au':
      // AU Bank: Option 1: 8-digit Customer ID, Option 2: First 4 letters of name + DDMM
      if (PASSWORD_PATTERNS.aubank_customer_id.test(text)) {
        return ['customer_id'];
      }
      if (PASSWORD_PATTERNS.aubank_name_dob.test(text)) {
        return ['name', 'dob'];
      }
      break;
  }
  
  // Fallback to general pattern detection
  return extractFieldsFromText(emailBody);
}
