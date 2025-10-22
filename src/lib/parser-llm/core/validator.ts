/**
 * Validate and normalize LLM output
 */

import type { ParsedStatementContent, ParsedTransaction } from '../providers/types';
import { z } from 'zod';

/**
 * Zod schema for validation
 */
const TransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().min(1, 'Description required'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['Dr', 'Cr']),
  category: z.string().optional(),
  sub_category: z.string().optional(),
});

const StatementSchema = z.object({
  bank: z.string().min(1, 'Bank required'),
  card_details: z.object({
    card_type: z.string(),
    masked_number: z.string(),
    credit_limit: z.number().optional(),
    available_credit: z.number().optional(),
  }),
  owner_details: z.object({
    name: z.string().min(1, 'Name required'),
    email: z.string().email().optional().or(z.literal('')),
  }),
  statement_period: z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  summary: z.object({
    total_dues: z.number(),
    minimum_due: z.number().nonnegative(),
    previous_balance: z.number(),
    payment_received: z.number().optional(),
    purchase_amount: z.number().nonnegative().optional(),
  }),
  transactions: z.array(TransactionSchema).min(1, 'At least one transaction required'),
});

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  content?: ParsedStatementContent;
};

/**
 * Validate parsed statement content
 */
export function validateParsedContent(content: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate with Zod
    const validated = StatementSchema.parse(content);

    // Additional business logic validation
    
    // Check date ranges
    const startDate = new Date(validated.statement_period.start_date);
    const endDate = new Date(validated.statement_period.end_date);
    const dueDate = new Date(validated.statement_period.due_date);

    if (startDate > endDate) {
      errors.push('Start date must be before end date');
    }

    if (endDate > dueDate) {
      warnings.push('Due date is before statement end date (unusual)');
    }

    // Check if transaction dates are within period
    validated.transactions.forEach((txn, idx) => {
      const txnDate = new Date(txn.date);
      if (txnDate < startDate || txnDate > endDate) {
        warnings.push(`Transaction ${idx + 1} date outside statement period`);
      }
    });

    // Check for suspicious patterns
    if (validated.transactions.length < 2) {
      warnings.push('Very few transactions found (< 2)');
    }

    if (validated.transactions.length > 500) {
      warnings.push('Unusually high number of transactions (> 500)');
    }

    // Check amount consistency
    const totalDebits = validated.transactions
      .filter(t => t.type === 'Dr')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expectedPurchase = validated.summary.purchase_amount || totalDebits;
    const difference = Math.abs(totalDebits - expectedPurchase);
    
    if (difference > expectedPurchase * 0.1) {
      warnings.push('Transaction total doesn\'t match summary (>10% difference)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      content: validated as ParsedStatementContent,
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        warnings,
      };
    }

    return {
      valid: false,
      errors: [error.message || 'Unknown validation error'],
      warnings,
    };
  }
}

/**
 * Normalize amounts (handle different formats)
 */
export function normalizeAmount(amount: any): number {
  if (typeof amount === 'number') return Math.abs(amount);
  
  if (typeof amount === 'string') {
    // Remove currency symbols, commas, spaces
    const cleaned = amount.replace(/[₹,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return Math.abs(parsed);
  }

  return 0;
}

/**
 * Normalize date formats to YYYY-MM-DD
 */
export function normalizeDate(date: string): string {
  // Already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [day, month, year] = date.split('/');
    return `${year}-${month}-${day}`;
  }

  // DDMMYYYY
  if (/^\d{8}$/.test(date)) {
    const day = date.substring(0, 2);
    const month = date.substring(2, 4);
    const year = date.substring(4, 8);
    return `${year}-${month}-${day}`;
  }

  // Try parsing as Date
  try {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {}

  throw new Error(`Unable to normalize date: ${date}`);
}

/**
 * Calculate confidence score for parsed content
 */
export function calculateConfidence(content: ParsedStatementContent): number {
  let score = 0;
  let maxScore = 0;

  // Bank identified (10 points)
  maxScore += 10;
  if (content.bank && content.bank !== 'OTHER' && content.bank !== 'UNKNOWN') {
    score += 10;
  }

  // Card details present (20 points)
  maxScore += 20;
  if (content.card_details.masked_number && content.card_details.card_type) {
    score += 10;
  }
  if (content.card_details.credit_limit && content.card_details.credit_limit > 0) {
    score += 10;
  }

  // Dates valid (15 points)
  maxScore += 15;
  try {
    const start = new Date(content.statement_period.start_date);
    const end = new Date(content.statement_period.end_date);
    const due = new Date(content.statement_period.due_date);
    if (start < end && end < due) {
      score += 15;
    }
  } catch {}

  // Transactions (40 points)
  maxScore += 40;
  const txnCount = content.transactions.length;
  if (txnCount >= 5) score += 10;
  if (txnCount >= 10) score += 10;
  
  // Check if amounts are reasonable
  const avgAmount = content.transactions.reduce((sum, t) => sum + t.amount, 0) / txnCount;
  if (avgAmount > 100 && avgAmount < 100000) score += 10;

  // Check if dates are consistent
  const validDates = content.transactions.filter(t => {
    try {
      const date = new Date(t.date);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }).length;
  score += Math.min(10, (validDates / txnCount) * 10);

  // Summary data (15 points)
  maxScore += 15;
  if (content.summary.total_dues > 0) score += 5;
  if (content.summary.minimum_due > 0 && content.summary.minimum_due < content.summary.total_dues) score += 5;
  if (content.summary.purchase_amount !== undefined && content.summary.purchase_amount > 0) score += 5;

  return Math.round((score / maxScore) * 100);
}




