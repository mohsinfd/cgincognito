/**
 * Card Matcher: Fuzzy match extracted card names to CardGenius cards
 * Uses Levenshtein distance for string similarity
 */

import { CARDGENIUS_CARDS, type CardInfo } from './card-registry';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity ratio (0-100)
 */
function similarityRatio(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  
  const distance = levenshteinDistance(str1, str2);
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * Normalize card name for matching
 * - Lowercase
 * - Remove special characters
 * - Remove common words (credit, card, bank)
 */
function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ')          // Normalize spaces
    .replace(/\b(credit|card|bank|rewards|cashback)\b/g, '') // Remove common words
    .trim();
}

export type CardMatchResult = {
  card: CardInfo;
  confidence: number;
  matchedOn: string;
};

/**
 * Match extracted card name to CardGenius database
 * 
 * @param extractedCardType - Card type from statement (e.g., "Live+", "Magnus", "Cashback")
 * @param bankId - Bank ID to limit search
 * @param confidenceThreshold - Minimum confidence to return match (default: 70)
 * @returns Match result or null if no confident match
 */
export function matchCardName(
  extractedCardType: string,
  bankId: number,
  confidenceThreshold: number = 70
): CardMatchResult | null {
  if (!extractedCardType || !bankId) {
    console.log('❌ Missing card type or bank ID');
    return null;
  }

  // Get all cards for this bank
  const bankCards = CARDGENIUS_CARDS.filter(card => card.bankId === bankId);
  
  if (bankCards.length === 0) {
    console.log(`❌ No cards found for bank ID ${bankId}`);
    return null;
  }

  console.log(`🔍 Matching "${extractedCardType}" against ${bankCards.length} cards for bank ${bankId}`);

  const normalized = normalizeCardName(extractedCardType);
  
  // Try exact matches first (case-insensitive, normalized)
  const exactMatches = bankCards.filter(card => {
    const cardNormalized = normalizeCardName(card.name);
    return cardNormalized === normalized;
  });

  if (exactMatches.length === 1) {
    console.log(`✅ Exact match found: ${exactMatches[0].name} (100% confidence)`);
    return {
      card: exactMatches[0],
      confidence: 100,
      matchedOn: 'exact',
    };
  }

  // Try fuzzy matching
  const matches: CardMatchResult[] = [];

  for (const card of bankCards) {
    const cardNormalized = normalizeCardName(card.name);
    
    // Calculate similarity for full name
    const fullSimilarity = similarityRatio(normalized, cardNormalized);
    
    // Also check if extracted name is a substring (common case: "Live+" vs "HSBC Live+ Credit Card")
    const isSubstring = cardNormalized.includes(normalized) || normalized.includes(cardNormalized);
    const substringBonus = isSubstring ? 20 : 0;
    
    // Final confidence
    const confidence = Math.min(100, fullSimilarity + substringBonus);
    
    console.log(`  📊 ${card.name}: ${confidence.toFixed(1)}% (full: ${fullSimilarity.toFixed(1)}%, substring: ${substringBonus})`);
    
    matches.push({
      card,
      confidence: Math.round(confidence),
      matchedOn: 'fuzzy',
    });
  }

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);

  // Return best match if above threshold
  const bestMatch = matches[0];
  
  if (bestMatch && bestMatch.confidence >= confidenceThreshold) {
    console.log(`✅ Best match: ${bestMatch.card.name} (${bestMatch.confidence}% confidence)`);
    return bestMatch;
  }

  console.log(`⚠️ No confident match found (best: ${bestMatch?.confidence || 0}%, threshold: ${confidenceThreshold}%)`);
  return null;
}

/**
 * Extract card info from parsed statement
 */
export function extractCardInfoFromStatement(statement: any): {
  cardType: string | null;
  bankId: number | null;
} {
  // Try multiple paths for card type
  const cardType = 
    statement.content?.content?.card_details?.card_type ||
    statement.content?.card_details?.card_type ||
    statement.card_details?.card_type ||
    null;

  // Try multiple paths for bank code
  const bankCode = (
    statement.bankCode ||
    statement.content?.content?.bank ||
    statement.content?.bank ||
    statement.bank ||
    ''
  ).toLowerCase();

  // Map bank code to bank ID
  const BANK_CODE_TO_ID: Record<string, number> = {
    'amex': 3,
    'au': 5,
    'axis': 1,
    'hdfc': 8,
    'hsbc': 10,
    'icici': 4,
    'idfc': 7,
    'indusind': 6,
    'sbi': 11,
    'stanc': 12,
    'rbl': 13,
    'yes': 14,
    'kotak': 15,
    'federal': 16,
  };

  const bankId = BANK_CODE_TO_ID[bankCode] || null;

  console.log(`📄 Extracted from statement:`, {
    cardType,
    bankCode,
    bankId,
  });

  return { cardType, bankId };
}

/**
 * Auto-match card for a statement
 * Returns card ID if confident match, null if needs user input
 */
export function autoMatchCard(statement: any, confidenceThreshold: number = 80): CardMatchResult | null {
  const { cardType, bankId } = extractCardInfoFromStatement(statement);
  
  if (!cardType || !bankId) {
    console.log('⚠️ Cannot auto-match: missing card type or bank ID');
    return null;
  }

  return matchCardName(cardType, bankId, confidenceThreshold);
}

