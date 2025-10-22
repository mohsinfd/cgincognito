/**
 * CardGenius spend buckets - COMPLETE specification
 * Based on actual API contract
 */

/**
 * Statement-level transaction categories
 * These are what we assign to each transaction
 */
export type TransactionCategory =
  // E-commerce platforms
  | 'amazon_spends'
  | 'flipkart_spends'
  | 'grocery_spends_online'
  | 'other_online_spends'
  | 'other_offline_spends'
  
  // Food & Dining
  | 'online_food_ordering'      // Swiggy, Zomato delivery
  | 'dining_or_going_out'       // Restaurant dine-in
  
  // Travel (will be aggregated to annual)
  | 'flights'                   // Airlines
  | 'hotels'                    // Hotels, resorts
  
  // Utilities (split by type)
  | 'mobile_phone_bills'        // Jio, Airtel, Vi recharge
  | 'electricity_bills'         // Power bills
  | 'water_bills'               // Water bills
  | 'ott_channels'              // Netflix, Prime, Hotstar
  
  // Other categories
  | 'fuel'
  | 'school_fees'
  | 'rent'
  
  // Annual spend categories
  | 'insurance_health'
  | 'insurance_car_or_bike'
  | 'large_electronics'         // Mobile, TV, laptop
  | 'pharmacy';                 // Medicine

/**
 * CardGenius Calculator API request format
 * Mix of monthly and annual spend keys
 */
export type CGSpendVectorComplete = {
  // Monthly spends
  amazon_spends: number;
  flipkart_spends: number;
  grocery_spends_online: number;
  online_food_ordering: number;
  other_online_spends: number;
  other_offline_spends: number;
  dining_or_going_out: number;
  fuel: number;
  school_fees: number;
  rent: number;
  mobile_phone_bills: number;
  electricity_bills: number;
  water_bills: number;
  ott_channels: number;
  
  // Annual spends (will extrapolate from monthly transactions)
  hotels_annual: number;
  flights_annual: number;
  insurance_health_annual: number;
  insurance_car_or_bike_annual: number;
  large_electronics_purchase_like_mobile_tv_etc: number;
  
  // Pharmacy
  all_pharmacy: number;
  
  // Placeholders (set to 0)
  new_monthly_cat_1: number;
  new_monthly_cat_2: number;
  new_monthly_cat_3: number;
  new_cat_1: number;
  new_cat_2: number;
  new_cat_3: number;
  
  // Usage metrics (optional - can ignore for now)
  domestic_lounge_usage_quarterly?: number;
  international_lounge_usage_quarterly?: number;
  railway_lounge_usage_quarterly?: number;
  movie_usage?: number;
  movie_mov?: number;
  dining_usage?: number;
  dining_mov?: number;
  
  // User's current card
  selected_card_id?: string | null;
};

/**
 * Helper to create empty spend vector
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
    hotels_annual: 0,
    flights_annual: 0,
    insurance_health_annual: 0,
    insurance_car_or_bike_annual: 0,
    large_electronics_purchase_like_mobile_tv_etc: 0,
    all_pharmacy: 0,
    new_monthly_cat_1: 0,
    new_monthly_cat_2: 0,
    new_monthly_cat_3: 0,
    new_cat_1: 0,
    new_cat_2: 0,
    new_cat_3: 0,
    selected_card_id: null,
  };
}

