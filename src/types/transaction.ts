/**
 * Transaction types and CG bucket definitions
 * Updated to match complete CardGenius API specification
 */

export type CgBucket =
  // E-commerce platforms
  | 'amazon_spends'
  | 'flipkart_spends'
  | 'grocery_spends_online'
  | 'other_online_spends'
  | 'other_offline_spends'
  
  // Food & Dining (split into delivery vs dine-in)
  | 'online_food_ordering'      // Swiggy, Zomato
  | 'dining_or_going_out'       // Restaurants, cafes
  
  // Travel (split into flights vs hotels)
  | 'flights'                   // Airlines
  | 'hotels'                    // Hotels, resorts
  
  // Utilities (split by type)
  | 'mobile_phone_bills'        // Telecom
  | 'electricity_bills'         // Power
  | 'water_bills'               // Water
  | 'ott_channels'              // Netflix, Prime
  
  // Other monthly
  | 'fuel'
  | 'school_fees'
  | 'rent'
  
  // Annual/occasional
  | 'insurance_health'
  | 'insurance_car_or_bike'
  | 'large_electronics'         // Mobile, TV, laptop
  | 'pharmacy';                 // Medicine

export type TransactionType = 'Dr' | 'Cr';

export type Txn = {
  txn_id: string; // stable hash
  statement_id: string; // vendor or internal
  txn_date: string; // YYYY-MM-DD
  amount: number; // INR+
  type: TransactionType;
  raw_desc: string;
  merchant_norm?: string; // normalized merchant name
  vendor_cat?: string; // as provided by vendor
  cg_bucket: CgBucket; // mapped bucket
  card_last4?: string; // masked
  source_currency?: string;
  source_amount?: number;
};

export type SpendSnapshot = {
  user_id: string;
  month: string; // YYYY-MM
  source: 'statement' | 'gmail_statement';
  buckets: Record<CgBucket, number>;
};

/**
 * JSON Schema for transaction validation
 */
export const TxnSchema = {
  $id: 'https://cardgenius/schemas/txn.json',
  type: 'object',
  required: ['txn_id', 'statement_id', 'txn_date', 'amount', 'type', 'raw_desc', 'cg_bucket'],
  properties: {
    txn_id: { type: 'string' },
    statement_id: { type: 'string' },
    txn_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    amount: { type: 'number', minimum: 0 },
    type: { enum: ['Dr', 'Cr'] },
    raw_desc: { type: 'string' },
    merchant_norm: { type: 'string' },
    vendor_cat: { type: 'string' },
    cg_bucket: {
      enum: [
        'amazon_spends',
        'flipkart_spends',
        'grocery_spends_online',
        'online_food_ordering',
        'other_online_spends',
        'other_offline_spends',
        'dining_or_going_out',
        'flights',
        'hotels',
        'mobile_phone_bills',
        'electricity_bills',
        'water_bills',
        'ott_channels',
        'fuel',
        'school_fees',
        'rent',
        'insurance_health',
        'insurance_car_or_bike',
        'large_electronics',
        'pharmacy',
      ],
    },
    card_last4: { type: 'string', pattern: '^\\d{2,4}$' },
  },
} as const;
