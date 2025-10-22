/**
 * Complete mapper aligned with CardGenius API
 * Handles all 20+ spend categories
 */

import type { TransactionCategory, CGSpendVectorComplete } from '@/types/cg-buckets';

/**
 * Map transaction to correct category
 * Priority: BoostScore category → Description patterns → Default
 */
export function mapTransactionCategory(
  description: string,
  boostScoreCategory?: string,
  boostScoreSubCategory?: string,
  amount?: number
): TransactionCategory {
  const desc = (description || '').toLowerCase();
  const cat = (boostScoreCategory || '').toUpperCase();
  const subCat = (boostScoreSubCategory || '').toUpperCase();

  // If we already have a valid LLM category, trust it
  const validLLMCategories = [
    'amazon_spends', 'flipkart_spends', 'grocery_spends_online', 'online_food_ordering',
    'dining_or_going_out', 'other_online_spends', 'other_offline_spends', 'flights',
    'hotels', 'mobile_phone_bills', 'electricity_bills', 'water_bills', 'ott_channels',
    'fuel', 'school_fees', 'rent', 'insurance_health', 'insurance_car_or_bike',
    'large_electronics', 'pharmacy', 'upi_transactions'
  ];
  
  if (cat && validLLMCategories.includes(cat.toLowerCase())) {
    return cat.toLowerCase() as TransactionCategory;
  }

  // ===== FOOD & DINING =====
  
  // Online Food Ordering (Swiggy, Zomato, Talabat)
  if (
    desc.includes('swiggy') ||
    desc.includes('bundl technologies') ||
    desc.includes('zomato') ||
    desc.includes('talabat') ||
    desc.includes('ubereats') ||
    desc.includes('deliveroo') ||
    (cat === 'FOOD' && subCat === 'FOOD_DELIVERY')
  ) {
    return 'online_food_ordering';
  }

  // Dining (restaurants, cafes - dine-in)
  if (
    desc.includes('restaurant') ||
    desc.includes('cafe') ||
    desc.includes('coffee') ||
    desc.includes('starbucks') ||
    (cat === 'FOOD' && subCat === 'CAFE') ||
    cat === 'FOOD'  // Generic food → dining
  ) {
    return 'dining_or_going_out';
  }

  // ===== E-COMMERCE =====
  
  // Amazon
  if (desc.includes('amazon') && !desc.includes('pay.*bill')) {
    return 'amazon_spends';
  }

  // Flipkart
  if (desc.includes('flipkart') || desc.includes('fkrt')) {
    return 'flipkart_spends';
  }

  // Online Grocery
  if (
    desc.includes('blinkit') ||
    desc.includes('instamart') ||
    desc.includes('bigbasket') ||
    desc.includes('zepto') ||
    desc.includes('dunzo') ||
    desc.includes('grofers')
  ) {
    return 'grocery_spends_online';
  }

  // ===== TRAVEL =====
  
  // Flights (Airlines)
  if (
    desc.includes('indigo') ||
    desc.includes('vistara') ||
    desc.includes('airasia') ||
    desc.includes('spicejet') ||
    desc.includes('air india') ||
    desc.includes('goair') ||
    desc.includes('emirates') ||
    desc.includes('etihad') ||
    desc.includes('qatar airways') ||
    (cat === 'TRAVEL' && (desc.includes('air') || desc.includes('flight')))
  ) {
    return 'flights';
  }

  // Hotels
  if (
    desc.includes('hotel') ||
    desc.includes('resort') ||
    desc.includes('rotana') ||
    desc.includes('marriott') ||
    desc.includes('hilton') ||
    desc.includes('oyo') ||
    desc.includes('treebo') ||
    desc.includes('booking.com') ||
    (cat === 'TRAVEL' && (desc.includes('hotel') || desc.includes('accommodation')))
  ) {
    return 'hotels';
  }

  // Ride-sharing & Taxis → other_online_spends or other_offline_spends
  if (
    desc.includes('uber') ||
    desc.includes('ola') ||
    desc.includes('rapido') ||
    desc.includes('careem')
  ) {
    return 'other_online_spends';  // App-based = online
  }

  if (desc.includes('taxi') || desc.includes('cab')) {
    return 'other_offline_spends';  // Street taxi = offline
  }

  // MakeMyTrip, Goibibo → Check if we can infer flight vs hotel
  if (desc.includes('makemytrip') || desc.includes('goibibo') || desc.includes('cleartrip')) {
    // These book both flights and hotels - default to flights
    // User should review if it was actually hotel
    return 'flights';  // Default assumption
  }

  // Duty Free → flights (airport shopping)
  if (desc.includes('duty free')) {
    return 'flights';  // Associated with flight travel
  }

  // ===== UTILITIES (Split into 4) =====
  
  // Mobile/Telecom
  if (
    desc.includes('airtel') ||
    desc.includes('jio') ||
    desc.includes('vi') ||
    desc.includes('vodafone') ||
    desc.includes('bsnl') ||
    desc.includes('idea') ||
    desc.includes('mobile recharge') ||
    desc.includes('prepaid') ||
    desc.includes('postpaid')
  ) {
    return 'mobile_phone_bills';
  }

  // OTT Channels
  if (
    desc.includes('netflix') ||
    desc.includes('amazon prime') ||
    desc.includes('hotstar') ||
    desc.includes('disney') ||
    desc.includes('zee5') ||
    desc.includes('sonyliv') ||
    desc.includes('voot')
  ) {
    return 'ott_channels';
  }

  // Electricity
  if (
    desc.includes('electricity') ||
    desc.includes('power bill') ||
    desc.includes('bescom') ||
    desc.includes('msedcl') ||
    desc.includes('tata power')
  ) {
    return 'electricity_bills';
  }

  // Water
  if (desc.includes('water bill') || desc.includes('water supply')) {
    return 'water_bills';
  }

  // ===== FUEL =====
  
  if (
    desc.includes('hpcl') ||
    desc.includes('iocl') ||
    desc.includes('bpcl') ||
    desc.includes('shell') ||
    desc.includes('petrol') ||
    desc.includes('fuel') ||
    cat === 'FUEL'
  ) {
    return 'fuel';
  }

  // ===== EDUCATION =====
  
  if (
    desc.includes('school') ||
    desc.includes('tuition') ||
    desc.includes('college') ||
    desc.includes('university') ||
    desc.includes('education') ||
    cat === 'EDUCATION'
  ) {
    return 'school_fees';
  }

  // ===== RENT =====
  
  if (
    desc.includes('rent') ||
    desc.includes('nobroker') ||
    desc.includes('housing') ||
    desc.includes('mygate')
  ) {
    return 'rent';
  }

  // ===== INSURANCE =====
  
  if (desc.includes('health insurance') || desc.includes('medical insurance')) {
    return 'insurance_health';
  }

  if (
    desc.includes('car insurance') ||
    desc.includes('bike insurance') ||
    desc.includes('vehicle insurance')
  ) {
    return 'insurance_car_or_bike';
  }

  // Generic insurance
  if (desc.includes('insurance') || desc.includes('policy')) {
    return 'insurance_health';  // Default to health
  }

  // ===== PHARMACY =====
  
  if (
    desc.includes('pharma') ||
    desc.includes('medicine') ||
    desc.includes('apollo pharmacy') ||
    desc.includes('medplus') ||
    desc.includes('netmeds') ||
    desc.includes('1mg')
  ) {
    return 'pharmacy';
  }

  // ===== LARGE ELECTRONICS =====
  
  // Check amount + description
  if (amount && amount > 10000) {
    if (
      desc.includes('mobile') ||
      desc.includes('iphone') ||
      desc.includes('samsung') ||
      desc.includes('laptop') ||
      desc.includes('macbook') ||
      desc.includes('television') ||
      desc.includes('tv') ||
      desc.includes('electronics') ||
      desc.includes('croma') ||
      desc.includes('reliance digital')
    ) {
      return 'large_electronics';
    }
  }

  // ===== NEW CATEGORIZATION RULES =====
  
  // UPI Transactions
  if (desc.includes('upi')) {
    return 'upi_transactions';
  }
  
  // DREAMPLUG TECHNOLOGIES = CRED (rent, maintenance, education, school fees)
  if (desc.includes('dreamplug') || desc.includes('cred')) {
    return 'rent';
  }
  
  // PhonePe utility payments
  if (desc.includes('phonepe') && desc.includes('utility')) {
    return 'mobile_phone_bills';
  }
  
  // VPS = Vidyut Prashasan Seva (Electricity Administration Service) via HDFC PayZapp
  if (desc.includes('vps')) {
    return 'electricity_bills';
  }
  
  // ===== E-COMMERCE FALLBACK =====
  
  if (cat === 'E_COMMERCE') {
    return 'other_online_spends';
  }

  // ===== SHOPPING FALLBACK =====
  
  if (cat === 'SHOPPING') {
    return 'other_offline_spends';
  }

  // ===== DEFAULT =====
  
  // If we have no idea, check if it's online or offline
  // Online indicators: www, http, .com, .in
  if (desc.includes('www') || desc.includes('http') || desc.includes('.com') || desc.includes('.in')) {
    return 'other_online_spends';
  }

  // Default to offline
  return 'other_offline_spends';
}

/**
 * Determine if transaction should be counted monthly or annually
 */
export function isAnnualCategory(category: TransactionCategory): boolean {
  return (
    category === 'flights' ||
    category === 'hotels' ||
    category === 'insurance_health' ||
    category === 'insurance_car_or_bike' ||
    category === 'large_electronics'
  );
}

/**
 * Map our categories to CG API keys
 */
export function getCGApiKey(category: TransactionCategory): keyof CGSpendVectorComplete {
  // Most categories map 1:1
  const directMappings: Record<string, keyof CGSpendVectorComplete> = {
    amazon_spends: 'amazon_spends',
    flipkart_spends: 'flipkart_spends',
    grocery_spends_online: 'grocery_spends_online',
    online_food_ordering: 'online_food_ordering',
    other_online_spends: 'other_online_spends',
    other_offline_spends: 'other_offline_spends',
    dining_or_going_out: 'dining_or_going_out',
    fuel: 'fuel',
    school_fees: 'school_fees',
    rent: 'rent',
    mobile_phone_bills: 'mobile_phone_bills',
    electricity_bills: 'electricity_bills',
    water_bills: 'water_bills',
    ott_channels: 'ott_channels',
    pharmacy: 'all_pharmacy',
    upi_transactions: 'other_online_spends', // Map UPI to other_online_spends for now
    
    // Annual categories
    flights: 'flights_annual',
    hotels: 'hotels_annual',
    insurance_health: 'insurance_health_annual',
    insurance_car_or_bike: 'insurance_car_or_bike_annual',
    large_electronics: 'large_electronics_purchase_like_mobile_tv_etc',
  };

  return directMappings[category] || 'other_offline_spends';
}

/**
 * Create an empty spend vector with all categories set to 0
 */
export function createEmptySpendVector(): CGSpendVectorComplete {
  return {
    amazon_spends: 0,
    flipkart_spends: 0,
    grocery_spends_online: 0,
    online_food_ordering: 0,
    other_online_spends: 0,
    other_offline_spends: 0,
    dining_or_going_out: 0,
    fuel: 0,
    school_fees: 0,
    rent: 0,
    mobile_phone_bills: 0,
    electricity_bills: 0,
    water_bills: 0,
    ott_channels: 0,
    all_pharmacy: 0,
    flights_annual: 0,
    hotels_annual: 0,
    insurance_health_annual: 0,
    insurance_car_or_bike_annual: 0,
    large_electronics_purchase_like_mobile_tv_etc: 0,
  };
}

// Re-export for compatibility
export { type TransactionCategory, type CgBucket };
