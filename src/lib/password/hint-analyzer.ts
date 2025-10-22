/**
 * Password Hint Analyzer - Main Orchestrator
 * Combines regex patterns, LLM analysis, and caching for smart password extraction
 */

import { 
  extractFieldsFromText, 
  extractPasswordFormat, 
  generateInstructions,
  getBankSpecificHints,
  type PasswordField 
} from './patterns';
import { 
  getCachedPattern, 
  cachePattern, 
  updatePatternStats,
  type PasswordRequirement 
} from './cache';
import { 
  analyzePasswordHintWithLLM, 
  isEmailSuitableForLLM,
  estimateLLMCost 
} from './llm-analyzer';

/**
 * Main function to analyze password requirements from email
 * Uses hybrid approach: cache → regex → LLM
 */
export async function analyzePasswordHint(
  emailBody: string,
  bankCode: string
): Promise<PasswordRequirement> {
  console.log(`🔍 Analyzing password hint for ${bankCode}`);
  
  // Step 1: Check cache first
  const cachedPattern = getCachedPattern(bankCode);
  if (cachedPattern && cachedPattern.confidence !== 'low') {
    console.log(`🎯 Using cached pattern for ${bankCode}`);
    return cachedPattern;
  }
  
  // Step 2: Try regex patterns
  const regexResult = analyzeWithRegex(emailBody, bankCode);
  if (regexResult.confidence === 'high') {
    console.log(`✅ High confidence regex match for ${bankCode}`);
    
    // Cache the successful pattern
    cachePattern(bankCode, regexResult);
    
    return {
      ...regexResult,
      bankCode,
      createdAt: new Date().toISOString(),
      successCount: 0,
      totalAttempts: 0,
    };
  }
  
  // Step 3: Use LLM for complex analysis (if suitable and API key available)
  if (process.env.OPENAI_API_KEY && isEmailSuitableForLLM(emailBody)) {
    console.log(`🤖 Using LLM analysis for ${bankCode}`);
    
    const cost = estimateLLMCost(emailBody);
    console.log(`💰 Estimated cost: ₹${cost.costINR.toFixed(2)}`);
    
    try {
      const llmResult = await analyzePasswordHintWithLLM(emailBody, bankCode);
      
      // Cache LLM result if confidence is medium or high
      if (llmResult.confidence !== 'low') {
        cachePattern(bankCode, llmResult);
      }
      
      return llmResult;
    } catch (error) {
      console.error('LLM analysis failed, falling back to regex:', error);
    }
  }
  
  // Step 4: Fallback to regex result (even if low confidence)
  console.log(`⚠️ Using fallback regex pattern for ${bankCode}`);
  
  const fallbackResult = {
    ...regexResult,
    bankCode,
    createdAt: new Date().toISOString(),
    successCount: 0,
    totalAttempts: 0,
  };
  
  // Don't cache low confidence patterns
  if (fallbackResult.confidence !== 'low') {
    cachePattern(bankCode, fallbackResult);
  }
  
  return fallbackResult;
}

/**
 * Analyze password hint using regex patterns
 */
function analyzeWithRegex(emailBody: string, bankCode: string): Omit<PasswordRequirement, 'bankCode' | 'createdAt' | 'successCount' | 'totalAttempts'> {
  // Try bank-specific patterns first
  const bankSpecificFields = getBankSpecificHints(bankCode, emailBody);
  
  if (bankSpecificFields.length > 0) {
    const format = extractPasswordFormat(emailBody);
    const instructions = generateInstructions(bankSpecificFields, format);
    
    return {
      fields: bankSpecificFields,
      format,
      instructions,
      confidence: 'high', // Bank-specific patterns are high confidence
      source: 'regex',
    };
  }
  
  // Fallback to general pattern detection
  const generalFields = extractFieldsFromText(emailBody);
  const format = extractPasswordFormat(emailBody);
  const instructions = generateInstructions(generalFields, format);
  
  // Determine confidence based on pattern matches
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  if (generalFields.length > 0) {
    // Check if we found specific format instructions
    if (format.includes('DDMMYYYY') || format.includes('last 4 digits') || format.includes('PAN')) {
      confidence = 'high';
    } else if (generalFields.length >= 2) {
      confidence = 'medium';
    } else {
      confidence = 'medium';
    }
  }
  
  // If no patterns found, provide default suggestions
  if (generalFields.length === 0) {
    return {
      fields: getDefaultFieldsForBank(bankCode),
      format: 'Password protected (format not detected)',
      instructions: generateDefaultInstructions(bankCode),
      confidence: 'low',
      source: 'regex',
    };
  }
  
  return {
    fields: generalFields,
    format,
    instructions,
    confidence,
    source: 'regex',
  };
}

/**
 * Get default password fields for a bank when no patterns are detected
 */
function getDefaultFieldsForBank(bankCode: string): PasswordField[] {
  switch (bankCode.toLowerCase()) {
    case 'hdfc':
    case 'axis':
      return ['dob']; // These banks commonly use DOB
      
    case 'sbi':
    case 'icici':
      return ['card_last4']; // These banks commonly use card digits
      
    case 'kotak':
      return ['mobile']; // Kotak sometimes uses mobile
      
    case 'hsbc':
    case 'sc':
      return ['name', 'dob']; // International banks often use name + DOB
      
    default:
      return ['dob', 'card_last4']; // Most common combination
  }
}

/**
 * Generate default instructions when no patterns are detected
 */
function generateDefaultInstructions(bankCode: string): string {
  const bankName = bankCode.toUpperCase();
  
  switch (bankCode.toLowerCase()) {
    case 'hdfc':
    case 'axis':
      return `${bankName} statements are typically protected with your date of birth (DDMMYYYY format).`;
      
    case 'sbi':
    case 'icici':
      return `${bankName} statements are typically protected with the last 4 digits of your card number.`;
      
    case 'kotak':
      return `${bankName} statements may be protected with your registered mobile number or date of birth.`;
      
    default:
      return `${bankName} statements are typically protected with your date of birth (DDMMYYYY) or last 4 digits of your card.`;
  }
}

/**
 * Update pattern success/failure after password attempt
 */
export function reportPasswordAttemptResult(
  bankCode: string,
  success: boolean,
  usedFields: PasswordField[]
): void {
  console.log(`📊 Reporting ${success ? 'success' : 'failure'} for ${bankCode} with fields: ${usedFields.join(', ')}`);
  
  updatePatternStats(bankCode, success);
  
  // If successful, we could potentially update the cached pattern
  // to reflect which specific fields worked
  if (success) {
    const cachedPattern = getCachedPattern(bankCode);
    if (cachedPattern && cachedPattern.confidence === 'low') {
      // Upgrade confidence for successful low-confidence patterns
      const updatedPattern = {
        ...cachedPattern,
        confidence: 'medium' as const,
        fields: usedFields, // Update to the fields that actually worked
      };
      
      cachePattern(bankCode, updatedPattern);
      console.log(`⬆️ Upgraded ${bankCode} pattern confidence to medium`);
    }
  }
}

/**
 * Get analysis summary for debugging
 */
export function getAnalysisSummary(emailBody: string, bankCode: string): {
  emailLength: number;
  hasPasswordKeywords: boolean;
  regexMatches: string[];
  suitableForLLM: boolean;
  estimatedLLMCost: number;
  cachedPattern: PasswordRequirement | null;
} {
  const text = emailBody.toLowerCase();
  const passwordKeywords = ['password', 'unlock', 'open', 'access', 'decrypt', 'protected'];
  const hasPasswordKeywords = passwordKeywords.some(keyword => text.includes(keyword));
  
  const regexMatches: string[] = [];
  if (text.includes('ddmmyyyy')) regexMatches.push('DDMMYYYY');
  if (text.includes('last 4')) regexMatches.push('Last 4 digits');
  if (text.includes('pan')) regexMatches.push('PAN');
  if (text.includes('mobile')) regexMatches.push('Mobile');
  
  return {
    emailLength: emailBody.length,
    hasPasswordKeywords,
    regexMatches,
    suitableForLLM: isEmailSuitableForLLM(emailBody),
    estimatedLLMCost: estimateLLMCost(emailBody).costINR,
    cachedPattern: getCachedPattern(bankCode),
  };
}

