/**
 * Optimizer types and interfaces
 * Based on PRD Section D3
 */

import type { Txn, CgBucket } from './transaction';

export type ExplanationTag =
  | 'WRONG_CHANNEL'
  | 'CAP_EXCEEDED'
  | 'MERCHANT_EXCLUSION'
  | 'FX_FEE'
  | 'BILLPAY_BONUS'
  | 'CASHBACK_CARD_MISUSE';

export type OptimizerInput = {
  user_id: string;
  month: string; // YYYY-MM
  txns: Txn[]; // same month
  user_cards: string[]; // card keys or issuer+product identifiers
};

export type OptimizerFinding = {
  txn_id: string;
  actual_card?: string; // infer from last4 if known
  best_card: string; // from CG Calculator API
  delta_value: number; // ₹ gain vs actual
  explanation: ExplanationTag[]; // reasons
};

export type OptimizerResult = {
  month: string;
  total_missed: number;
  by_category: Record<CgBucket, number>;
  top_changes: Array<{ rule: string; est_monthly_gain: number }>;
  findings: OptimizerFinding[];
};

/**
 * CardGenius Calculator API request/response types
 * COMPLETE specification based on actual API contract
 */
export type CGSpendVector = {
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
  
  // Annual spends
  hotels_annual: number;
  flights_annual: number;
  insurance_health_annual: number;
  insurance_car_or_bike_annual: number;
  large_electronics_purchase_like_mobile_tv_etc: number;
  
  // Pharmacy
  all_pharmacy: number;
  
  // Placeholders
  new_monthly_cat_1: number;
  new_monthly_cat_2: number;
  new_monthly_cat_3: number;
  new_cat_1: number;
  new_cat_2: number;
  new_cat_3: number;
  
  // Optional usage metrics (can ignore for now)
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

// Export as complete version
export type CGSpendVectorComplete = CGSpendVector;

export type CGCardRecommendation = {
  card_id: string;
  card_name: string;
  issuer: string;
  image_url: string;
  reward_summary: {
    annual_savings_est: number;
    monthly_savings_est: number;
    breakdown: Array<{
      bucket: string;
      savings: number;
    }>;
  };
  fees: {
    joining: number;
    annual: number;
  };
  milestone_benefits: string[];
  welcome_benefits: string;
  net_gain_first_year: number;
};

export type CGCalculatorResponse = {
  status: string;
  cards: CGCardRecommendation[];
  meta: {
    requested_spends: Partial<CGSpendVector>;
    calculation_date: string;
  };
};
