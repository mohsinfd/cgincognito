/**
 * Smart category mapper with confidence scoring
 * Flags transactions that need user review
 */

import type { CgBucket } from '@/types/transaction';
import { mapBucket } from './rules';
import { mapTransactionCategory } from './complete-mapper';

export type CategoryConfidence = 'high' | 'medium' | 'low';

export type SmartCategoryResult = {
  bucket: CgBucket;
  confidence: CategoryConfidence;
  needsReview: boolean;
  reason?: string;
};

/**
 * High-confidence patterns (90%+ accuracy)
 */
const HIGH_CONFIDENCE_PATTERNS = [
  // Food delivery
  /swiggy|zomato|ubereats|foodpanda/i,
  // E-commerce
  /amazon(?! pay.*bill)|flipkart|myntra/i,
  // Grocery online
  /blinkit|instamart|bigbasket|zepto|dunzo/i,
  // Fuel
  /\b(hpcl|iocl|bpcl|shell)\b/i,
  // Airlines
  /indigo|vistara|airasia|spicejet|air india/i,
  // Ride sharing
  /\b(uber|ola)\b/i,
  // Telecom
  /\b(jio|airtel|vi|vodafone)\b.*recharge/i,
  // Railways
  /irctc/i,
];

/**
 * Medium-confidence patterns (70-85% accuracy)
 */
const MEDIUM_CONFIDENCE_PATTERNS = [
  /restaurant|cafe|coffee|dhaba/i,
  /hotel|resort/i,
  /supermarket|hypermarket/i,
  /petrol|diesel/i,
  /bill.*payment/i,
];

/**
 * Ambiguous patterns that always need review
 */
const AMBIGUOUS_PATTERNS = [
  /paytm|phonepe|gpay|googlepay/i, // Wallet payments (lose merchant info)
  /^pos /i, // Generic POS transactions
  /merchant|payment|transaction/i, // Too generic
];

/**
 * Smart categorization with confidence scoring
 */
export function categorizeSmart(
  vendorCat: string | undefined,
  description: string | undefined,
  amount: number
): SmartCategoryResult {
  // Handle undefined or empty description
  if (!description || typeof description !== 'string') {
      return {
      bucket: mapTransactionCategory('', vendorCat),
      confidence: 'low',
      needsReview: true,
      reason: 'Missing description',
    };
  }

  const desc = description.toLowerCase();

  const bucket = mapTransactionCategory(description, vendorCat, undefined, amount);

  // Check for ambiguous patterns first
  if (AMBIGUOUS_PATTERNS.some(p => p.test(desc))) {
    return {
      bucket,
      confidence: 'low',
      needsReview: true,
      reason: 'Generic payment description - merchant unclear',
    };
  }

  // Check for high confidence patterns
  if (HIGH_CONFIDENCE_PATTERNS.some(p => p.test(desc))) {
    return {
      bucket,
      confidence: 'high',
      needsReview: false,
      reason: 'Clear merchant match',
    };
  }

  // Check for medium confidence patterns
  if (MEDIUM_CONFIDENCE_PATTERNS.some(p => p.test(desc))) {
    return {
      bucket,
      confidence: 'medium',
      needsReview: false,  // Changed: Don't flag for review if we have reasonable match
      reason: 'Partial match - reasonable category',
    };
  }

  // Very short descriptions - flag for review
  if (desc.length < 5) {
    return {
      bucket,
      confidence: 'low',
      needsReview: true,  // Only flag truly short ones
      reason: 'Description too short',
    };
  }

  // Number-only descriptions - flag for review
  if (/^\d+$/.test(desc)) {
    return {
      bucket,
      confidence: 'low',
      needsReview: true,
      reason: 'Description is just numbers',
    };
  }

  // Check if vendor category helps
  if (vendorCat && vendorCat.trim() && vendorCat !== 'OTHER') {
    return {
      bucket,
      confidence: 'medium',
      needsReview: false,  // Trust BoostScore category
      reason: 'Based on BoostScore category',
    };
  }

  // Has reasonable description but no clear pattern - don't flag
  if (desc.length >= 10) {
    return {
      bucket,
      confidence: 'medium',
      needsReview: false,  // Approach B: Don't flag if has detail
      reason: 'Reasonable default category',
    };
  }

  // Truly ambiguous - flag for review
  return {
    bucket,
    confidence: 'low',
    needsReview: true,
    reason: 'Unclear category - please review',
  };
}

/**
 * Filter transactions that need user review
 */
export function getTransactionsNeedingReview(
  transactions: Array<{ 
    raw_desc?: string;
    description?: string;
    vendor_cat?: string;
    amount: number;
  }>
): number[] {
  const needsReview: number[] = [];

  transactions.forEach((txn, index) => {
    const desc = txn.raw_desc || txn.description || '';
    const result = categorizeSmart(txn.vendor_cat, desc, txn.amount);
    if (result.needsReview) {
      needsReview.push(index);
    }
  });

  return needsReview;
}

/**
 * Get confidence statistics for a set of transactions
 */
export function getCategoryStats(
  transactions: Array<{ 
    raw_desc?: string;
    description?: string;
    vendor_cat?: string;
    category?: string;
    sub_category?: string;
    amount: number;
  }>
): {
  high: number;
  medium: number;
  low: number;
  needsReview: number;
} {
  let high = 0;
  let medium = 0;
  let low = 0;
  let needsReview = 0;

  transactions.forEach(txn => {
    // Handle different property names from different sources
    const desc = txn.raw_desc || txn.description || '';
    const vendor = txn.vendor_cat || txn.category || txn.sub_category;
    
    const result = categorizeSmart(vendor, desc, txn.amount || 0);
    
    if (result.confidence === 'high') high++;
    else if (result.confidence === 'medium') medium++;
    else low++;
    
    if (result.needsReview) needsReview++;
  });

  return { high, medium, low, needsReview };
}
