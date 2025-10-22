/**
 * Card Matcher - Match statements to specific user cards
 */

import type { UserCard, CardMatch, EnhancedUserDetails } from '@/types/card-registry';

/**
 * Match a statement to a specific card from user's registry
 */
export function matchStatementToCard(
  bankCode: string,
  detectedCardNumbers: string[], // From email subject/filename
  userCards: UserCard[]
): CardMatch {
  
  // Filter cards from the same bank
  const bankCards = userCards.filter(
    card => card.bank_code.toLowerCase() === bankCode.toLowerCase() && card.status === 'active'
  );
  
  if (bankCards.length === 0) {
    return {
      matched: false,
      confidence: 'none',
      reason: `No active ${bankCode.toUpperCase()} cards found in user registry`,
    };
  }
  
  // If we detected card numbers from email, try exact match
  if (detectedCardNumbers.length > 0) {
    for (const detectedNum of detectedCardNumbers) {
      // Try matching last 6 (for HSBC)
      if (detectedNum.length === 6) {
        const last6 = detectedNum;
        const match = bankCards.find(card => card.last6 === last6);
        if (match) {
          return {
            matched: true,
            card: match,
            confidence: 'high',
            reason: `Matched last6 "${last6}" from email to registered card`,
          };
        }
      }
      
      // Try matching last 4
      if (detectedNum.length >= 4) {
        const last4 = detectedNum.slice(-4);
        const match = bankCards.find(card => card.last4 === last4);
        if (match) {
          return {
            matched: true,
            card: match,
            confidence: 'high',
            reason: `Matched last4 "${last4}" from email to registered card`,
          };
        }
      }
      
      // Try matching last 2
      if (detectedNum.length >= 2) {
        const last2 = detectedNum.slice(-2);
        const matches = bankCards.filter(card => card.last4.slice(-2) === last2);
        if (matches.length === 1) {
          return {
            matched: true,
            card: matches[0],
            confidence: 'medium',
            reason: `Matched last2 "${last2}" from email to single registered card`,
          };
        }
        if (matches.length > 1) {
          // Multiple cards with same last2 - use the first one but lower confidence
          return {
            matched: true,
            card: matches[0],
            confidence: 'low',
            reason: `Multiple cards match last2 "${last2}", using first match`,
          };
        }
      }
    }
  }
  
  // No card number detected or no match - use first card from this bank
  if (bankCards.length === 1) {
    return {
      matched: true,
      card: bankCards[0],
      confidence: 'medium',
      reason: `Only one ${bankCode.toUpperCase()} card registered, using it by default`,
    };
  }
  
  // Multiple cards, no way to distinguish
  return {
    matched: true,
    card: bankCards[0],
    confidence: 'low',
    reason: `Multiple ${bankCode.toUpperCase()} cards found, using first one (recommend user to verify)`,
  };
}

/**
 * Build enhanced user details with matched card
 */
export function buildEnhancedUserDetails(
  userName: string,
  userDob: string,
  userMobile: string | undefined,
  matchedCard: UserCard | undefined,
  allUserCards: UserCard[]
): EnhancedUserDetails {
  
  return {
    name: userName,
    dob: userDob,
    mobile: userMobile,
    
    card: matchedCard ? {
      last6: matchedCard.last6,
      last4: matchedCard.last4,
      last2: matchedCard.last4 ? matchedCard.last4.slice(-2) : undefined,
      bank_code: matchedCard.bank_code,
      card_type: matchedCard.card_type,
    } : undefined,
    
    allCards: allUserCards
      .filter(c => c.status === 'active')
      .map(c => ({
        last4: c.last4,
        bank_code: c.bank_code,
      })),
  };
}

/**
 * Helper to create a simple card registry from card numbers array (backward compatible)
 */
export function createSimpleCardRegistry(
  userId: string,
  bankCode: string,
  cardNumbers: string[]
): UserCard[] {
  return cardNumbers.map((cardNum, index) => {
    const isLast6 = cardNum.length === 6;
    const last4 = isLast6 ? cardNum.slice(-4) : cardNum.padStart(4, '0');
    
    return {
      card_id: `temp_${bankCode}_${cardNum}`,
      user_id: userId,
      bank_code: bankCode,
      last6: isLast6 ? cardNum : undefined,
      last4: last4,
      last2: last4.slice(-2),
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

/**
 * Validate card number format
 */
export function validateCardLast4(input: string): { valid: boolean; normalized?: string; error?: string } {
  const cleaned = input.replace(/\s/g, '');
  
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'Card number must contain only digits' };
  }
  
  if (cleaned.length < 2) {
    return { valid: false, error: 'Card number must be at least 2 digits' };
  }
  
  if (cleaned.length > 6) {
    return { valid: false, error: 'Please provide only last 4 or last 6 digits' };
  }
  
  // Keep as-is for 6 digits (HSBC), or normalize to 4 digits
  const normalized = cleaned.length === 6 ? cleaned : cleaned.padStart(4, '0');
  
  return { valid: true, normalized };
}

/**
 * Extract and validate card numbers from user input
 */
export function parseCardNumbersInput(input: string): string[] {
  // Split by common delimiters
  const parts = input.split(/[,;\s]+/).filter(p => p.length > 0);
  
  const validated: string[] = [];
  
  for (const part of parts) {
    const result = validateCardLast4(part);
    if (result.valid && result.normalized) {
      validated.push(result.normalized);
    }
  }
  
  return [...new Set(validated)]; // Remove duplicates
}

