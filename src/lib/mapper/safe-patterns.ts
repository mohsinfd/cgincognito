/**
 * Safe pattern matching with context awareness
 * Prevents false positives while maximizing coverage
 */

import type { TransactionCategory } from '@/types/cg-buckets';

/**
 * Safe categorization with context checks
 */
export function safelyCategorize(
  description: string,
  boostScoreCategory?: string,
  amount?: number
): TransactionCategory | null {
  const desc = description.toLowerCase();
  const cat = (boostScoreCategory || '').toUpperCase();

  // ===== HIGH CONFIDENCE PATTERNS (Very specific) =====
  
  // Food Delivery (unique names, safe to match)
  if (
    desc.includes('swiggy') ||
    desc.includes('bundl technologies') ||
    desc.includes('zomato') ||
    desc.includes('talabat') ||
    desc.includes('ubereats')
  ) {
    return 'online_food_ordering';
  }

  // E-commerce (unique names)
  if (desc.includes('amazon') && !desc.includes('pay.*bill')) {
    return 'amazon_spends';
  }

  if (desc.includes('flipkart') || desc.includes('fkrt')) {
    return 'flipkart_spends';
  }

  // Online Grocery (unique names)
  if (
    desc.includes('blinkit') ||
    desc.includes('instamart') ||
    desc.includes('bigbasket') ||
    desc.includes('zepto')
  ) {
    return 'grocery_spends_online';
  }

  // Airlines (unique names)
  if (
    desc.includes('indigo') ||
    desc.includes('vistara') ||
    desc.includes('spicejet') ||
    desc.includes('emirates') ||
    desc.includes('air india') ||
    desc.includes('etihad')
  ) {
    return 'flights';
  }

  // Fuel (unique names)
  if (
    desc.includes('hpcl') ||
    desc.includes('iocl') ||
    desc.includes('bpcl') ||
    desc.includes('shell') ||
    cat === 'FUEL'
  ) {
    return 'fuel';
  }

  // ===== MEDIUM CONFIDENCE (With BoostScore validation) =====
  
  // Telecom - Only if BoostScore agrees OR clear context
  if (
    desc.includes('airtel') ||
    desc.includes('jio') ||
    desc.includes('vodafone') ||
    cat === 'TELECOM' ||
    cat === 'UTILITY' && desc.includes('recharge')
  ) {
    return 'mobile_phone_bills';
  }

  // VI - ONLY if:
  // 1. Has "VI" as standalone word AND
  // 2. BoostScore says TELECOM/UTILITY OR has "recharge"/"mobile" OR amount is typical recharge
  if (/\bvi\b/i.test(desc)) {
    const hasTelecomContext = 
      cat === 'TELECOM' ||
      cat === 'UTILITY' ||
      desc.includes('recharge') ||
      desc.includes('mobile') ||
      desc.includes('mumbai') || // VI Mumbai is telecom
      (amount && amount >= 100 && amount <= 3000); // Typical recharge range
    
    if (hasTelecomContext) {
      return 'mobile_phone_bills';
    }
  }

  // OTT - Only specific platforms
  if (
    desc.includes('netflix') ||
    desc.includes('prime video') ||
    desc.includes('hotstar') ||
    desc.includes('disney+') ||
    desc.includes('zee5')
  ) {
    return 'ott_channels';
  }

  // Electricity - Only if clear keywords OR BoostScore
  if (
    desc.includes('electricity') ||
    desc.includes('power bill') ||
    desc.includes('bescom') ||
    desc.includes('msedcl') ||
    cat === 'UTILITY' && desc.includes('electric')
  ) {
    return 'electricity_bills';
  }

  // Hotels - Only if clear keywords OR BoostScore
  if (
    desc.includes('hotel') ||
    desc.includes('resort') ||
    desc.includes('rotana') ||
    desc.includes('marriott') ||
    desc.includes('hilton') ||
    desc.includes('oyo') ||
    cat === 'TRAVEL' && desc.includes('hotel')
  ) {
    return 'hotels';
  }

  // Ride-sharing - Only specific apps
  if (
    desc.includes('uber') ||
    desc.includes('careem') ||
    /\bola\b/i.test(desc) && !desc.includes('cola') // Ola but not Cola
  ) {
    return 'other_online_spends';
  }

  // Taxi - Only if has "taxi" or "cab"
  if (desc.includes('taxi') || desc.includes('cab')) {
    return 'other_offline_spends';
  }

  // Pharmacy - Specific pharmacies only
  if (
    desc.includes('pharmacy') ||
    desc.includes('apollo') && desc.includes('pharm') ||
    desc.includes('medplus') ||
    desc.includes('netmeds') ||
    desc.includes('1mg')
  ) {
    return 'pharmacy';
  }

  // ===== LOW CONFIDENCE (Trust BoostScore category) =====
  
  // Use BoostScore category hints
  if (cat === 'E_COMMERCE') return 'other_online_spends';
  if (cat === 'SHOPPING') return 'other_offline_spends';
  if (cat === 'FOOD') return 'dining_or_going_out';
  if (cat === 'TRAVEL') return 'flights'; // Default to flights
  if (cat === 'MEDICAL') return 'pharmacy';
  if (cat === 'EDUCATION') return 'school_fees';

  // ===== NO MATCH =====
  
  // Check if online or offline based on description
  if (desc.includes('www') || desc.includes('.com') || desc.includes('.in')) {
    return 'other_online_spends';
  }

  return null; // Will use default in caller
}

/**
 * Validate if a pattern match is reliable
 */
export function isReliableMatch(
  description: string,
  category: TransactionCategory
): { reliable: boolean; reason?: string } {
  const desc = description.toLowerCase();

  // Short descriptions are unreliable
  if (desc.length < 5) {
    return { reliable: false, reason: 'Description too short' };
  }

  // Number-only is unreliable
  if (/^\d+$/.test(desc)) {
    return { reliable: false, reason: 'Description is just numbers' };
  }

  // Very generic descriptions
  if (desc === 'pos' || desc === 'merchant' || desc === 'payment') {
    return { reliable: false, reason: 'Too generic' };
  }

  // Check for potential false positives
  if (category === 'mobile_phone_bills' && /\bvi\b/i.test(desc)) {
    // VI matched - is it actually telecom?
    if (!desc.includes('recharge') && !desc.includes('mobile') && !desc.includes('mumbai')) {
      return { reliable: false, reason: 'VI match might be false positive' };
    }
  }

  return { reliable: true };
}
