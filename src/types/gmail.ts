/**
 * Gmail integration types
 * Based on PRD Section F
 */

export type GmailScope = 
  | 'https://www.googleapis.com/auth/gmail.readonly'
  | 'https://www.googleapis.com/auth/gmail.modify'
  | 'openid'
  | 'email';

export const REQUIRED_SCOPES: GmailScope[] = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'openid',
  'email',
];

export const OPTIONAL_SCOPES: GmailScope[] = [
  'https://www.googleapis.com/auth/gmail.modify',
];

/**
 * Gmail OAuth token response
 */
export type GmailTokenResponse = {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
  id_token?: string;
};

/**
 * Decoded ID token from Google OAuth
 */
export type GoogleIdToken = {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

/**
 * Gmail query registry for Indian issuers
 * Based on PRD Section F2
 */
export type GmailQueryEntry = {
  issuer: string;
  bank_code: string;
  query: string;
};

export const GMAIL_QUERIES: GmailQueryEntry[] = [
  // HDFC Bank - Broader search, filtering done in code
  {
    issuer: 'HDFC',
    bank_code: 'hdfc',
    query: 'from:hdfcbank statement has:attachment',
  },
  // State Bank of India
  {
    issuer: 'SBI',
    bank_code: 'sbi',
    query: 'from:sbicard statement has:attachment',
  },
  // ICICI Bank
  {
    issuer: 'ICICI',
    bank_code: 'icici',
    query: 'from:icicibank statement has:attachment',
  },
  // Axis Bank
  {
    issuer: 'Axis',
    bank_code: 'axis',
    query: 'from:axisbank statement has:attachment',
  },
  // Kotak Mahindra Bank
  {
    issuer: 'Kotak',
    bank_code: 'kotak',
    query: 'from:kotak statement has:attachment',
  },
  // HSBC India
  {
    issuer: 'HSBC',
    bank_code: 'hsbc',
    query: 'from:hsbc.co.in statement has:attachment',
  },
  // Standard Chartered
  {
    issuer: 'Standard Chartered',
    bank_code: 'sc',
    query: 'from:sc.com statement has:attachment',
  },
  // Citibank India
  {
    issuer: 'Citibank',
    bank_code: 'citi',
    query: 'from:citibank statement has:attachment',
  },
  // IndusInd Bank
  {
    issuer: 'IndusInd',
    bank_code: 'indusind',
    query: 'from:indusind statement has:attachment',
  },
  // Yes Bank
  {
    issuer: 'Yes Bank',
    bank_code: 'yes',
    query: 'from:yesbank statement has:attachment',
  },
  // RBL Bank
  {
    issuer: 'RBL',
    bank_code: 'rbl',
    query: 'from:rblbank statement has:attachment',
  },
  // IDFC First Bank
  {
    issuer: 'IDFC First',
    bank_code: 'idfc',
    query: 'from:idfcfirstbank statement has:attachment',
  },
  // Federal Bank
  {
    issuer: 'Federal',
    bank_code: 'federal',
    query: 'from:federalbank statement has:attachment',
  },
  // Union Bank
  {
    issuer: 'Union Bank',
    bank_code: 'union',
    query: 'from:unionbankofindia statement has:attachment',
  },
  // Canara Bank
  {
    issuer: 'Canara',
    bank_code: 'canara',
    query: 'from:canarabank statement has:attachment',
  },
  // Bank of Baroda
  {
    issuer: 'Bank of Baroda',
    bank_code: 'bob',
    query: 'from:bankofbaroda statement has:attachment',
  },
];

/**
 * Gmail message metadata
 */
export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  historyId?: string;
};

/**
 * Gmail attachment metadata
 */
export type GmailAttachment = {
  message_id: string;
  attachment_id: string;
  filename: string;
  mime_type: string;
  size: number;
  data?: string; // base64 encoded
};

/**
 * Ingestion checkpoint
 */
export type GmailCheckpoint = {
  user_id: string;
  last_history_id?: string;
  last_sync_time: string; // ISO timestamp
  messages_processed: number;
};

