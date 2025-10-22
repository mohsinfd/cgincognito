-- CardGenius Database Schema
-- Based on PRD Section J

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Gmail accounts table (OAuth tokens encrypted)
CREATE TABLE gmail_accounts (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL, -- encrypted
  refresh_token TEXT NOT NULL, -- encrypted
  history_id TEXT,
  scopes TEXT[] NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gmail_accounts_email ON gmail_accounts(email);
CREATE INDEX idx_gmail_accounts_google_sub ON gmail_accounts(google_sub);

-- Statements table
CREATE TABLE statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES gmail_accounts(user_id) ON DELETE CASCADE,
  vendor_stmt_id TEXT UNIQUE,
  bank_code TEXT NOT NULL,
  card_last4 TEXT,
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  source TEXT NOT NULL CHECK (source IN ('upload', 'gmail_statement')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_statements_user_id ON statements(user_id);
CREATE INDEX idx_statements_status ON statements(status);
CREATE INDEX idx_statements_bank_code ON statements(bank_code);
CREATE INDEX idx_statements_period ON statements(period_start, period_end);

-- Transactions table
CREATE TABLE transactions (
  txn_id TEXT PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  txn_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Dr', 'Cr')),
  raw_desc TEXT NOT NULL,
  merchant_norm TEXT,
  vendor_cat TEXT,
  cg_bucket TEXT NOT NULL CHECK (cg_bucket IN (
    'amazon_spends', 'flipkart_spends', 'grocery_spends_online',
    'online_food_ordering', 'other_online_spends', 'other_offline_spends',
    'dining_or_going_out', 'flights', 'hotels',
    'mobile_phone_bills', 'electricity_bills', 'water_bills', 'ott_channels',
    'fuel', 'school_fees', 'rent',
    'insurance_health', 'insurance_car_or_bike', 'large_electronics', 'pharmacy'
  )),
  card_last4 TEXT,
  source_currency TEXT,
  source_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_statement_id ON transactions(statement_id);
CREATE INDEX idx_transactions_txn_date ON transactions(txn_date);
CREATE INDEX idx_transactions_cg_bucket ON transactions(cg_bucket);
CREATE INDEX idx_transactions_merchant_norm ON transactions(merchant_norm);

-- Monthly spend snapshots
CREATE TABLE spend_snapshot_monthly (
  user_id UUID NOT NULL REFERENCES gmail_accounts(user_id) ON DELETE CASCADE,
  month CHAR(7) NOT NULL, -- YYYY-MM
  source TEXT NOT NULL CHECK (source IN ('statement', 'gmail_statement')),
  buckets JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, month, source)
);

CREATE INDEX idx_spend_snapshot_user_month ON spend_snapshot_monthly(user_id, month);

-- Optimizer results cache
CREATE TABLE optimizer_results (
  user_id UUID NOT NULL REFERENCES gmail_accounts(user_id) ON DELETE CASCADE,
  month CHAR(7) NOT NULL, -- YYYY-MM
  total_missed NUMERIC NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, month)
);

CREATE INDEX idx_optimizer_results_user_month ON optimizer_results(user_id, month);

-- Gmail sync checkpoints (for polling)
CREATE TABLE gmail_sync_checkpoints (
  user_id UUID PRIMARY KEY REFERENCES gmail_accounts(user_id) ON DELETE CASCADE,
  last_history_id TEXT,
  last_sync_time TIMESTAMPTZ NOT NULL,
  messages_processed INTEGER DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics events (optional)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES gmail_accounts(user_id) ON DELETE SET NULL,
  properties JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);

-- Bank codes reference table
CREATE TABLE bank_codes (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  country TEXT DEFAULT 'IN',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed bank codes (partial list - expand as needed)
INSERT INTO bank_codes (code, name, display_name) VALUES
  ('hdfc', 'HDFC', 'HDFC Bank'),
  ('sbi', 'SBI', 'State Bank of India'),
  ('icici', 'ICICI', 'ICICI Bank'),
  ('axis', 'AXIS', 'Axis Bank'),
  ('kotak', 'KOTAK', 'Kotak Mahindra Bank'),
  ('hsbc', 'HSBC', 'HSBC Bank'),
  ('sc', 'SC', 'Standard Chartered'),
  ('citi', 'CITI', 'Citibank'),
  ('amex', 'AMEX', 'American Express'),
  ('indusind', 'INDUSIND', 'IndusInd Bank'),
  ('yes', 'YES', 'Yes Bank'),
  ('rbl', 'RBL', 'RBL Bank')
ON CONFLICT (code) DO NOTHING;

-- Card caps reference table (for optimizer explanations)
CREATE TABLE card_caps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_key TEXT NOT NULL, -- issuer_product identifier
  cap_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'annual'
  category TEXT, -- CG bucket or 'overall'
  cap_amount NUMERIC,
  reset_day INTEGER, -- day of month/quarter/year
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_card_caps_card_key ON card_caps(card_key);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gmail_accounts_updated_at BEFORE UPDATE ON gmail_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_statements_updated_at BEFORE UPDATE ON statements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spend_snapshot_updated_at BEFORE UPDATE ON spend_snapshot_monthly
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_optimizer_results_updated_at BEFORE UPDATE ON optimizer_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Active statements with transaction counts
CREATE VIEW v_statements_summary AS
SELECT 
  s.id,
  s.user_id,
  s.bank_code,
  s.card_last4,
  s.period_start,
  s.period_end,
  s.status,
  s.source,
  COUNT(t.txn_id) as transaction_count,
  SUM(CASE WHEN t.type = 'Dr' THEN t.amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN t.type = 'Cr' THEN t.amount ELSE 0 END) as total_credits,
  s.created_at
FROM statements s
LEFT JOIN transactions t ON t.statement_id = s.id
GROUP BY s.id;

-- Monthly spend by bucket
CREATE VIEW v_monthly_spend_by_bucket AS
SELECT 
  t.statement_id,
  s.user_id,
  TO_CHAR(t.txn_date, 'YYYY-MM') as month,
  t.cg_bucket,
  SUM(CASE WHEN t.type = 'Dr' THEN t.amount ELSE -t.amount END) as net_amount,
  COUNT(*) as transaction_count
FROM transactions t
JOIN statements s ON s.id = t.statement_id
GROUP BY t.statement_id, s.user_id, TO_CHAR(t.txn_date, 'YYYY-MM'), t.cg_bucket;

-- Comments
COMMENT ON TABLE gmail_accounts IS 'OAuth tokens and Gmail connection metadata';
COMMENT ON TABLE statements IS 'Credit card statement records from upload or Gmail';
COMMENT ON TABLE transactions IS 'Normalized transaction data with CG bucket mapping';
COMMENT ON TABLE spend_snapshot_monthly IS 'Aggregated monthly spend by CG bucket';
COMMENT ON TABLE optimizer_results IS 'Cached optimizer outputs with missed savings';
COMMENT ON TABLE gmail_sync_checkpoints IS 'Polling checkpoints for Gmail ingestion';
COMMENT ON TABLE bank_codes IS 'Supported bank codes for validation';
COMMENT ON TABLE card_caps IS 'Card spending caps for optimizer explanations';
