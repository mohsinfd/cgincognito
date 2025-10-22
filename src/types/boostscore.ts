/**
 * BoostScore API types
 * Based on PRD Section E and fixtures in Section L
 */

export type BoostScoreUploadPayload = {
  name: string;
  dob: string; // DDMMYYYY
  bank: string; // bank code
  card_no: string; // min last2
  pass_str?: string; // optional password
};

export type BoostScoreUploadResponse = {
  id: string;
  processing_eta: {
    value: number;
    unit: 'ms' | 's';
  };
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  message?: string;
};

export type BoostScoreStatementStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type BoostScoreCardDetails = {
  bank: string;
  num: string; // masked
  card_type: string;
  credit_limit: number;
  available_credit_limit: number;
  available_cash_limit: number;
};

export type BoostScoreOwnerDetails = {
  name: string;
  email?: string;
};

export type BoostScoreSummary = {
  statement_date: string; // DDMMYYYY
  payment_due_date: string; // DDMMYYYY
  total_dues: number;
  min_amount_due: number;
  opening_balance: number;
  payment_amount: number;
  purchase_amount: number;
  financial_charges: number;
  cash_advances: number;
};

export type BoostScoreTransaction = {
  id: number | string;
  type: 'Dr' | 'Cr';
  date: string; // DDMMYYYY
  amount: number;
  description: string;
  category?: string;
  sub_category?: string;
};

export type BoostScoreRewardSummary = {
  opening_balance: number;
  earned: number;
  redeemed: number;
  expired: number;
  closing_balance: number;
  points_expiring: number;
  expiry_date: string;
};

export type BoostScoreContent = {
  card_details: BoostScoreCardDetails;
  owner_details: BoostScoreOwnerDetails;
  summary: BoostScoreSummary;
  transactions: BoostScoreTransaction[];
  reward_summary?: BoostScoreRewardSummary;
};

export type BoostScoreContentResponse = {
  id: string;
  status: BoostScoreStatementStatus;
  content?: BoostScoreContent;
  error_message?: string;
};

/**
 * Error response structure
 */
export type BoostScoreError = {
  error: string;
  message: string;
  status_code: number;
};

