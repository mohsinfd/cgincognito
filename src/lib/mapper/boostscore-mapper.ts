/**
 * BoostScore Category to CG Bucket Mapper
 * Maps BoostScore's categories to our CG buckets
 */

import type { CgBucket } from '@/types/transaction';

/**
 * Map BoostScore category + sub_category to CG bucket
 * Priority: Use BoostScore categories first, then fallback to description
 */
export function mapBoostScoreCategory(
  category?: string,
  subCategory?: string,
  description?: string
): CgBucket | null {
  const cat = (category || '').toUpperCase();
  const subCat = (subCategory || '').toUpperCase();
  const desc = (description || '').toLowerCase();

  // E_COMMERCE: Check description for specific platforms
  if (cat === 'E_COMMERCE') {
    if (desc.includes('amazon')) return 'amazon_spends';
    if (desc.includes('flipkart') || desc.includes('fkrt')) return 'flipkart_spends';
    if (desc.includes('blinkit') || desc.includes('instamart') || desc.includes('bigbasket') || desc.includes('zepto')) {
      return 'grocery_spends_online';
    }
    // Generic e-commerce
    return 'other_online_spends';
  }

  // FOOD
  if (cat === 'FOOD') {
    if (subCat === 'FOOD_DELIVERY') return 'dining_or_going_out';
    if (desc.includes('swiggy') || desc.includes('zomato')) return 'dining_or_going_out';
    if (desc.includes('blinkit') || desc.includes('instamart')) return 'grocery_spends_online';
    return 'dining_or_going_out'; // Default for food
  }

  // FUEL
  if (cat === 'FUEL') {
    return 'fuel';
  }

  // TRAVEL
  if (cat === 'TRAVEL' || cat === 'TRANSPORTATION') {
    return 'travel';
  }

  // UTILITY/UTILITIES
  if (cat === 'UTILITY' || cat === 'UTILITIES') {
    return 'utilities';
  }

  // EDUCATION
  if (cat === 'EDUCATION') {
    return 'school_fees';
  }

  // RENT/HOUSING
  if (cat === 'RENT' || cat === 'HOUSING') {
    return 'rent';
  }

  // GROCERY
  if (cat === 'GROCERY') {
    // Check if online
    if (desc.includes('online') || desc.includes('blinkit') || desc.includes('instamart')) {
      return 'grocery_spends_online';
    }
    return 'other_offline_spends'; // Physical grocery store
  }

  // Skip non-spending categories
  if (cat === 'LOAN' || subCat === 'EMI') {
    return null; // EMIs are not spending categories for our purposes
  }

  if (cat === 'INTEREST' || cat === 'CHARGES') {
    return null; // Fees/interest are not spending categories
  }

  if (cat === 'MONEY_TRANSFER' || subCat === 'CC_PAYMENT') {
    return null; // Payments/transfers are not spending
  }

  if (subCat === 'REVERSAL' || subCat === 'TAX') {
    return null; // Reversals and standalone tax entries
  }

  // OTHER category - use description-based mapping
  if (cat === 'OTHER') {
    return null; // Will fallback to description-based mapping
  }

  return null; // No match, will fallback
}

/**
 * Should this transaction be included in spend analysis?
 * Excludes: EMIs, interest, reversals, payments
 */
export function isSpendingTransaction(
  category?: string,
  subCategory?: string,
  type?: string,
  description?: string
): boolean {
  const cat = (category || '').toUpperCase();
  const subCat = (subCategory || '').toUpperCase();
  const desc = (description || '').toLowerCase();

  // Exclude credits (reversals, payments)
  if (type === 'Cr') {
    return false;
  }

  // Exclude EMIs and interest
  if (cat === 'LOAN' || cat === 'INTEREST') return false;
  if (subCat === 'EMI') return false;

  // Exclude charges and fees (unless they're actual spending)
  if (cat === 'CHARGES' && subCat === 'TAX') return false;

  // Exclude money transfers and payments
  if (cat === 'MONEY_TRANSFER') return false;
  if (subCat === 'CC_PAYMENT' || subCat === 'PAYMENT') return false;

  // Exclude reversals
  if (subCat === 'REVERSAL') return false;
  if (desc.includes('reversal') && type === 'Cr') return false;

  // Exclude GST charges (standalone tax entries)
  if (desc === 'gst' && cat === 'CHARGES') return false;

  return true;
}

