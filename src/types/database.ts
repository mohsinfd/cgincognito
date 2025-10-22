/**
 * Database table types
 * Based on PRD Section J
 */

export type GmailAccount = {
  user_id: string;
  google_sub: string;
  email: string;
  access_token: string; // encrypted
  refresh_token: string; // encrypted
  history_id?: string;
  scopes: string[];
  connected_at: Date;
};

export type Statement = {
  id: string;
  user_id: string;
  vendor_stmt_id?: string;
  bank_code: string;
  card_last4?: string;
  period_start?: Date;
  period_end?: Date;
  status: 'pending' | 'completed' | 'failed';
  source: 'upload' | 'gmail_statement';
  created_at: Date;
};

export type Transaction = {
  txn_id: string;
  statement_id: string;
  txn_date: Date;
  amount: number;
  type: 'Dr' | 'Cr';
  raw_desc: string;
  merchant_norm?: string;
  vendor_cat?: string;
  cg_bucket: string;
  card_last4?: string;
};

export type SpendSnapshotMonthly = {
  user_id: string;
  month: string; // YYYY-MM
  source: 'statement' | 'gmail_statement';
  buckets: Record<string, number>; // JSONB
};

export type OptimizerResultRow = {
  user_id: string;
  month: string; // YYYY-MM
  total_missed: number;
  payload: any; // JSONB
  created_at: Date;
};

