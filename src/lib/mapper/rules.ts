/**
 * Category mapping rules
 * Based on PRD Section G and T
 */

import type { CgBucket } from '@/types/transaction';

/**
 * Deterministic regex rules for merchant categorization
 * Priority: dining > grocery > fuel > specific platforms > travel > utilities > fees > rent
 */
export const CATEGORY_RULES: Record<CgBucket, RegExp[]> = {
  dining_or_going_out: [
    /swiggy/i,
    /bundl technologies/i, // Swiggy's company name
    /zomato/i,
    /talabat/i, // UAE food delivery
    /deliveroo/i, // International
    /restaurant/i,
    /dining/i,
    /\beats\b/i,
    /ubereats/i,
    /foodpanda/i,
    /dominoes/i,
    /pizza hut/i,
    /mcdonald/i,
    /kfc\b/i,
    /subway/i,
    /starbucks/i,
    /cafe/i,
    /coffee/i,
    /food delivery/i,
  ],
  grocery_spends_online: [
    /blinkit/i,
    /instamart/i,
    /bigbasket/i,
    /zepto/i,
    /dunzo/i,
    /grofers/i,
    /milkbasket/i,
    /jiomart grocery/i,
  ],
  fuel: [
    /\bhpcl\b/i,
    /\biocl\b/i,
    /\bbpcl\b/i,
    /petrol/i,
    /fuel/i,
    /hindustan petroleum/i,
    /indian oil/i,
    /bharat petroleum/i,
    /shell/i,
    /nayara energy/i,
    /reliance petroleum/i,
  ],
  amazon_spends: [
    /amazon(?! pay.*bill)/i, // Amazon but not "amazon pay bill"
    /amzn/i,
    /amazon\.in/i,
  ],
  flipkart_spends: [
    /flipkart/i,
    /fkrt/i,
  ],
  travel: [
    /indigo/i,
    /vistara/i,
    /airasia/i,
    /spicejet/i,
    /air india/i,
    /goair/i,
    /ixigo/i,
    /\birctc\b/i,
    /makemytrip/i,
    /\bmmt\b/i,
    /goibibo/i,
    /cleartrip/i,
    /\bola\b/i,
    /\buber\b/i,
    /uber rides/i,
    /rapido/i,
    /\bvia\.com/i,
    /yatra/i,
    /redbus/i,
    /hotel/i,
    /booking\.com/i,
    /oyo/i,
    /treebo/i,
    /careem/i, // UAE ride-sharing
    /emirates/i, // Airline
    /\btaxi\b/i,
  ],
  utilities: [
    /electricity/i,
    /water bill/i,
    /gas bill/i,
    /broadband/i,
    /\bjio\b/i,
    /airtel/i,
    /\bvi\b/i,
    /vodafone/i,
    /postpaid/i,
    /prepaid/i,
    /billpay/i,
    /bill payment/i,
    /mobile recharge/i,
    /dth recharge/i,
    /tata sky/i,
    /dish tv/i,
  ],
  school_fees: [
    /school fee/i,
    /tuition/i,
    /college fee/i,
    /education/i,
    /university/i,
    /coaching/i,
    /academy/i,
  ],
  rent: [
    /\brent\b/i,
    /nobroker/i,
    /housing rent/i,
    /mygate rent/i,
    /nestaway/i,
    /maintenance.*society/i,
  ],
  other_online_spends: [], // Placeholder, determined by online hint
  other_offline_spends: [], // Default fallback
};

/**
 * Map a transaction description to a CG bucket using deterministic rules
 * @param vendorCat Optional vendor category from statement
 * @param desc Transaction description
 * @param isOnline Optional hint if transaction is online/offline
 * @returns Matched CG bucket
 */
export function mapBucketDeterministic(
  vendorCat?: string,
  desc?: string,
  isOnline?: boolean
): CgBucket | null {
  const searchText = (vendorCat || desc || '').toLowerCase();

  // Check each category in priority order
  for (const [bucket, patterns] of Object.entries(CATEGORY_RULES)) {
    if (bucket === 'other_online_spends' || bucket === 'other_offline_spends') {
      continue; // Skip generic buckets
    }

    for (const pattern of patterns) {
      if (pattern.test(searchText)) {
        return bucket as CgBucket;
      }
    }
  }

  // No match found
  return null;
}

/**
 * Full mapping function with fallback to generic buckets
 * @param vendorCat Optional vendor category (from BoostScore)
 * @param desc Transaction description
 * @param isOnline Optional online/offline hint
 * @param subCategory Optional sub-category (from BoostScore)
 * @returns CG bucket (never null)
 */
export function mapBucket(
  vendorCat?: string,
  desc?: string,
  isOnline?: boolean,
  subCategory?: string
): CgBucket {
  // First, try BoostScore category mapping
  if (vendorCat || subCategory) {
    const boostScoreMatch = mapBoostScoreCategory(vendorCat, subCategory, desc);
    if (boostScoreMatch) {
      return boostScoreMatch;
    }
  }

  // Then try deterministic description-based mapping
  const deterministicMatch = mapBucketDeterministic(vendorCat, desc, isOnline);
  
  if (deterministicMatch) {
    return deterministicMatch;
  }

  // Fallback to generic buckets based on online hint
  return isOnline ? 'other_online_spends' : 'other_offline_spends';
}

/**
 * Map BoostScore category to CG bucket
 * Imported from boostscore-mapper to avoid circular dependency
 */
function mapBoostScoreCategory(
  category?: string,
  subCategory?: string,
  description?: string
): CgBucket | null {
  const cat = (category || '').toUpperCase();
  const subCat = (subCategory || '').toUpperCase();
  const desc = (description || '').toLowerCase();

  // E_COMMERCE
  if (cat === 'E_COMMERCE') {
    // Check description first for specific platforms
    if (desc.includes('amazon')) return 'amazon_spends';
    if (desc.includes('flipkart')) return 'flipkart_spends';
    if (desc.includes('blinkit') || desc.includes('instamart') || desc.includes('bigbasket') || desc.includes('zepto')) {
      return 'grocery_spends_online';
    }
    // Food delivery platforms (even if marked as E_COMMERCE)
    if (desc.includes('swiggy') || desc.includes('bundl technologies')) return 'dining_or_going_out';
    if (desc.includes('zomato')) return 'dining_or_going_out';
    if (desc.includes('talabat')) return 'dining_or_going_out'; // International food delivery
    // Generic e-commerce
    return 'other_online_spends';
  }

  // FOOD
  if (cat === 'FOOD') {
    if (subCat === 'FOOD_DELIVERY' || desc.includes('swiggy') || desc.includes('zomato')) {
      return 'dining_or_going_out';
    }
    if (desc.includes('blinkit') || desc.includes('instamart')) {
      return 'grocery_spends_online';
    }
    return 'dining_or_going_out';
  }

  // FUEL
  if (cat === 'FUEL') return 'fuel';

  // TRAVEL
  if (cat === 'TRAVEL' || cat === 'TRANSPORTATION') return 'travel';
  
  // SHOPPING - check description for specifics
  if (cat === 'SHOPPING') {
    if (desc.includes('duty free')) return 'travel'; // Airport duty free = travel
    if (desc.includes('arena') || desc.includes('mall')) return 'other_offline_spends';
    return 'other_offline_spends';
  }
  
  // MEDICAL
  if (cat === 'MEDICAL' || cat === 'HEALTHCARE') {
    // Note: We don't have a medical category in CG buckets yet
    // Map to other_offline for now
    return 'other_offline_spends';
  }

  // UTILITY
  if (cat === 'UTILITY' || cat === 'UTILITIES') return 'utilities';

  // EDUCATION
  if (cat === 'EDUCATION') return 'school_fees';

  // RENT
  if (cat === 'RENT' || cat === 'HOUSING') return 'rent';

  // GROCERY
  if (cat === 'GROCERY') {
    if (desc.includes('online') || desc.includes('blinkit') || desc.includes('instamart')) {
      return 'grocery_spends_online';
    }
    return 'other_offline_spends';
  }

  return null;
}

/**
 * Normalize merchant name from raw description
 * @param rawDesc Raw transaction description
 * @returns Normalized merchant name
 */
export function normalizeMerchant(rawDesc: string): string {
  let normalized = rawDesc.trim();

  // Remove common patterns
  normalized = normalized
    .replace(/\d{3,}/g, '') // Remove long numbers
    .replace(/[^\w\s]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .toUpperCase();

  // Truncate to reasonable length
  if (normalized.length > 50) {
    normalized = normalized.substring(0, 50);
  }

  return normalized;
}
