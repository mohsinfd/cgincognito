/**
 * Pre-Categorizer: Regex-based categorization BEFORE LLM
 * 
 * Uses merchant patterns from your actual transaction data
 * Catches obvious merchants (Amazon, Swiggy, etc.) without LLM
 * Saves ~60% on LLM costs
 */

export type PreCategoryResult = {
  category: string | null;
  confidence: number;
  method: 'merchant' | 'amount' | null;
};

/**
 * Pre-categorize transaction based on merchant name and amount
 * Returns null if no confident match found (send to LLM)
 */
export function preCategorize(
  description: string,
  amount?: number
): PreCategoryResult {
  const desc = description.toLowerCase();
  
  // HIGH CONFIDENCE MERCHANTS (95%) - No LLM needed
  
  // Amazon (exclude Amazon Pay bill payments)
  if (desc.includes('amazon') && !desc.includes('amazon pay') && !desc.includes('pay.*bill')) {
    return { category: 'amazon_spends', confidence: 0.95, method: 'merchant' };
  }
  
  // Flipkart
  if (desc.includes('flipkart')) {
    return { category: 'flipkart_spends', confidence: 0.95, method: 'merchant' };
  }
  
  // Food Delivery
  if (desc.includes('swiggy') || desc.includes('zomato')) {
    return { category: 'online_food_ordering', confidence: 0.95, method: 'merchant' };
  }
  
  // Grocery Delivery
  if (desc.includes('blinkit') || desc.includes('zepto') || desc.includes('bigbasket') || desc.includes('instamart') || desc.includes('dunzo')) {
    return { category: 'grocery_spends_online', confidence: 0.95, method: 'merchant' };
  }
  
  // Mobile Bills
  if (desc.includes('airtel') || desc.includes('jio') || desc.includes('vodafone') || desc.includes('bsnl')) {
    return { category: 'mobile_phone_bills', confidence: 0.95, method: 'merchant' };
  }
  
  // Electricity
  if (desc.includes('vps') || desc.includes('vidyut') || desc.includes('electricity')) {
    return { category: 'electricity_bills', confidence: 0.95, method: 'merchant' };
  }
  
  // UPI
  if (desc.includes('upi') || desc.includes('paytm') || desc.includes('phonepe') || desc.includes('gpay')) {
    return { category: 'upi_transactions', confidence: 0.95, method: 'merchant' };
  }
  
  // Airlines
  if (desc.includes('indigo') || desc.includes('vistara') || desc.includes('airasia') || desc.includes('spicejet') || desc.includes('air india')) {
    return { category: 'flights', confidence: 0.95, method: 'merchant' };
  }
  
  // Hotels
  if (desc.includes('oyo') || desc.includes('makemytrip') || desc.includes('booking.com')) {
    return { category: 'hotels', confidence: 0.95, method: 'merchant' };
  }
  
  // Google Services
  if (desc.includes('google play') || desc.includes('google cloud')) {
    return { category: 'other_online_spends', confidence: 0.95, method: 'merchant' };
  }
  
  // Uber
  if (desc.includes('uber') || desc.includes('ptm uber')) {
    return { category: 'other_online_spends', confidence: 0.95, method: 'merchant' };
  }
  
  // EMI
  if (desc.includes('emi') || desc.includes('principal')) {
    return { category: 'other_offline_spends', confidence: 0.90, method: 'merchant' };
  }
  
  // AMOUNT-BASED DETECTION (85% confidence)
  
  // Rent: ₹80k-₹95k through CRED/Dreamplug
  if (amount && amount >= 80000 && amount <= 95000) {
    if (desc.includes('cred') || desc.includes('dreamplug')) {
      return { category: 'rent', confidence: 0.85, method: 'amount' };
    }
  }
  
  // Rent: Explicit "CRED RENTAL"
  if (desc.includes('cred') && desc.includes('rent')) {
    return { category: 'rent', confidence: 0.95, method: 'merchant' };
  }
  
  // Large Electronics (>₹50k)
  if (amount && amount >= 50000) {
    if (desc.includes('laptop') || desc.includes('iphone') || desc.includes('samsung') || desc.includes('tv') || desc.includes('fridge')) {
      return { category: 'large_electronics', confidence: 0.80, method: 'amount' };
    }
  }
  
  // No confident match - send to LLM
  return { category: null, confidence: 0, method: null };
}

/**
 * Check if pre-categorization is sufficient (high confidence = skip LLM)
 */
export function shouldUsePreCategory(result: PreCategoryResult): boolean {
  return result.confidence >= 0.95 && result.category !== null;
}

