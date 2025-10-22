/**
 * Normalize BoostScore responses to CardGenius transaction format
 * Based on PRD Section L
 */

import type { BoostScoreContent, BoostScoreTransaction } from '@/types/boostscore';
import type { Txn, TransactionType } from '@/types/transaction';
import { normalizeMerchant } from '@/lib/mapper/rules';
import { mapTransactionCategory } from '@/lib/mapper/complete-mapper';
import { createHash } from 'crypto';

/**
 * Parse DDMMYYYY date format to YYYY-MM-DD
 */
function parseDDMMYYYY(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  const day = dateStr.substring(0, 2);
  const month = dateStr.substring(2, 4);
  const year = dateStr.substring(4, 8);

  return `${year}-${month}-${day}`;
}

/**
 * Generate stable transaction ID from transaction data
 */
function generateTxnId(
  statementId: string,
  date: string,
  amount: number,
  desc: string
): string {
  const data = `${statementId}|${date}|${amount}|${desc}`;
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Extract last 4 digits from masked card number
 */
function extractLast4(maskedCardNum: string): string | undefined {
  const digits = maskedCardNum.replace(/\D/g, '');
  if (digits.length >= 4) {
    return digits.substring(digits.length - 4);
  }
  if (digits.length >= 2) {
    return digits.substring(digits.length - 2);
  }
  return undefined;
}

/**
 * Normalize a single BoostScore transaction
 */
export function normalizeTransaction(
  bsTxn: BoostScoreTransaction,
  statementId: string,
  cardLast4?: string
): Txn | null {
  // Parse date
  const txnDate = parseDDMMYYYY(bsTxn.date);

  // Map to complete category set
  const cgBucket = mapTransactionCategory(
    bsTxn.description,
    bsTxn.category,
    bsTxn.sub_category,
    bsTxn.amount
  );

  // Normalize merchant
  const merchantNorm = normalizeMerchant(bsTxn.description);

  // Generate stable ID
  const txnId = generateTxnId(
    statementId,
    txnDate,
    bsTxn.amount,
    bsTxn.description
  );

  return {
    txn_id: txnId,
    statement_id: statementId,
    txn_date: txnDate,
    amount: bsTxn.amount,
    type: bsTxn.type as TransactionType,
    raw_desc: bsTxn.description,
    merchant_norm: merchantNorm,
    vendor_cat: bsTxn.category || bsTxn.sub_category || undefined,
    cg_bucket: cgBucket,
    card_last4: cardLast4,
  };
}

/**
 * Normalize complete BoostScore content to transactions
 */
export function normalizeContent(
  content: BoostScoreContent,
  statementId: string
): {
  transactions: Txn[];
  cardLast4?: string;
  periodStart?: string;
  periodEnd?: string;
  excludedCount: number;
  excludedReasons: Record<string, number>;
} {
  const cardLast4 = extractLast4(content.card_details.num);

  // Parse statement period
  let periodStart: string | undefined;
  let periodEnd: string | undefined;

  try {
    if (content.summary.statement_date) {
      periodEnd = parseDDMMYYYY(content.summary.statement_date);
    }
    // Estimate period start as ~30 days before end
    if (periodEnd) {
      const endDate = new Date(periodEnd);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
      periodStart = startDate.toISOString().split('T')[0];
    }
  } catch (error) {
    console.error('Failed to parse statement dates:', error);
  }

  // Track excluded transactions
  const excludedReasons: Record<string, number> = {};

  // Normalize all transactions, filtering out non-spending ones
  const transactions: Txn[] = [];
  
  for (const bsTxn of content.transactions) {
    // Check if this is a spending transaction
    const cat = (bsTxn.category || '').toUpperCase();
    const subCat = (bsTxn.sub_category || '').toUpperCase();
    const desc = (bsTxn.description || '').toLowerCase();
    
    // Skip non-spending categories
    if (bsTxn.type === 'Cr' && !desc.includes('cashback') && !desc.includes('reward')) {
      excludedReasons['Credits/Reversals'] = (excludedReasons['Credits/Reversals'] || 0) + 1;
      continue;
    }
    
    if (cat === 'LOAN' || cat === 'INTEREST' || subCat === 'EMI') {
      excludedReasons['EMI/Interest'] = (excludedReasons['EMI/Interest'] || 0) + 1;
      continue;
    }
    
    if (cat === 'CHARGES' && (subCat === 'TAX' || subCat === 'REVERSAL')) {
      excludedReasons['Fees/Charges'] = (excludedReasons['Fees/Charges'] || 0) + 1;
      continue;
    }
    
    // Exclude foreign currency fees
    if (desc.includes('foreign currency transaction fee') || desc.includes('forex fee') || desc.includes('fx fee')) {
      excludedReasons['Forex Fees'] = (excludedReasons['Forex Fees'] || 0) + 1;
      continue;
    }
    
    // Exclude DCC markup
    if (desc.includes('dcc markup')) {
      excludedReasons['Forex Fees'] = (excludedReasons['Forex Fees'] || 0) + 1;
      continue;
    }
    
    if (cat === 'MONEY_TRANSFER' || subCat === 'CC_PAYMENT') {
      excludedReasons['Payments/Transfers'] = (excludedReasons['Payments/Transfers'] || 0) + 1;
      continue;
    }
    
    if (subCat === 'REVERSAL') {
      excludedReasons['Reversals'] = (excludedReasons['Reversals'] || 0) + 1;
      continue;
    }
    
    // This is a spending transaction - normalize it
    const normalized = normalizeTransaction(bsTxn, statementId, cardLast4);
    if (normalized) {
      transactions.push(normalized);
    }
  }

  const excludedCount = Object.values(excludedReasons).reduce((sum, count) => sum + count, 0);

  console.log('📊 Transaction filtering:');
  console.log(`   Total: ${content.transactions.length}`);
  console.log(`   Spending: ${transactions.length}`);
  console.log(`   Excluded: ${excludedCount}`);
  if (excludedCount > 0) {
    console.log('   Reasons:', excludedReasons);
  }

  return {
    transactions,
    cardLast4,
    periodStart,
    periodEnd,
    excludedCount,
    excludedReasons,
  };
}
