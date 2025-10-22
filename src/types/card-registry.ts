/**
 * Card Registry Types
 * Manages user's card portfolio for password matching
 */

export type UserCard = {
  card_id: string;           // Unique identifier
  user_id: string;          // Owner
  bank_code: string;        // 'hdfc', 'sbi', 'icici', etc.
  last6?: string;           // Last 6 digits (for HSBC, SC)
  last4: string;            // Last 4 digits (mandatory)
  last2?: string;           // Last 2 digits (derived from last4)
  card_type?: string;       // "MoneyBack+", "Cashback", etc.
  nickname?: string;        // User-friendly name
  status: 'active' | 'inactive' | 'closed';
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  user_id: string;
  name: string;             // Full name as on all cards
  dob: string;              // DDMMYYYY format
  mobile?: string;          // Optional
  email: string;
  cards: UserCard[];        // Array of registered cards
  created_at: string;
  updated_at: string;
};

/**
 * Helper to match statement to specific card
 */
export type CardMatch = {
  matched: boolean;
  card?: UserCard;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
};

/**
 * Enhanced user details for password generation
 */
export type EnhancedUserDetails = {
  // User-level (constant)
  name: string;
  dob: string;
  mobile?: string;
  
  // Card-level (specific to this statement)
  card?: {
    last6?: string;
    last4: string;
    last2: string;
    bank_code: string;
    card_type?: string;
  };
  
  // All user's cards (fallback)
  allCards?: Array<{
    last4: string;
    bank_code: string;
  }>;
};

