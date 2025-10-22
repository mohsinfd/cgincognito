/**
 * Build CardGenius API spend vector from transactions
 * Handles monthly → annual conversion for flights, hotels, insurance
 */

import type { CGSpendVectorComplete } from '@/types/cg-buckets';
import { mapTransactionCategory, isAnnualCategory, getCGApiKey, createEmptySpendVector } from '@/lib/mapper/complete-mapper';

type Transaction = {
  description: string;
  category?: string;
  sub_category?: string;
  amount: number;
  type: string;
  date: string;
};

/**
 * Build complete spend vector from transactions
 * @param transactions Array of transactions (can be from multiple statements)
 * @param monthsOfData How many months of data (default 1)
 */
export function buildCompleteSpendVector(
  transactions: Transaction[],
  monthsOfData: number = 1
): CGSpendVectorComplete {
  const vector = createEmptySpendVector();
  
  // Temporary buckets for categorization
  const monthlySpend: Record<string, number> = {};
  const annualSpend: Record<string, number> = {};

  // Process each transaction
  transactions.forEach(txn => {
    // Skip credits (except cashback/rewards)
    if (txn.type === 'Cr' && !txn.description.toLowerCase().includes('cashback')) {
      return;
    }

    // Categorize
    const category = mapTransactionCategory(
      txn.description,
      txn.category,
      txn.sub_category,
      txn.amount
    );

    const amount = txn.type === 'Dr' ? txn.amount : -txn.amount;

    // Add to appropriate bucket
    if (isAnnualCategory(category)) {
      annualSpend[category] = (annualSpend[category] || 0) + amount;
    } else {
      monthlySpend[category] = (monthlySpend[category] || 0) + amount;
    }
  });

  // Convert monthly spend to monthly averages
  Object.entries(monthlySpend).forEach(([category, total]) => {
    const monthlyAverage = total / monthsOfData;
    const apiKey = getCGApiKey(category as any);
    (vector as any)[apiKey] = Math.max(0, Math.round(monthlyAverage));
  });

  // Convert annual spend: extrapolate from available data
  Object.entries(annualSpend).forEach(([category, total]) => {
    // If we have 1 month of data, multiply by 12 for annual estimate
    // If we have 3 months, multiply by 4, etc.
    const multiplier = 12 / monthsOfData;
    const annualEstimate = total * multiplier;
    const apiKey = getCGApiKey(category as any);
    (vector as any)[apiKey] = Math.max(0, Math.round(annualEstimate));
  });

  return vector;
}

/**
 * Build spend vector with category breakdown for debugging
 */
export function buildSpendVectorWithBreakdown(
  transactions: Transaction[],
  monthsOfData: number = 1
): {
  vector: CGSpendVectorComplete;
  breakdown: {
    category: string;
    monthlyAvg: number;
    transactionCount: number;
    apiKey: string;
  }[];
} {
  const vector = buildCompleteSpendVector(transactions, monthsOfData);
  
  // Build breakdown
  const categoryTotals: Record<string, { total: number; count: number }> = {};
  
  transactions.forEach(txn => {
    if (txn.type === 'Cr') return;
    
    const category = mapTransactionCategory(
      txn.description,
      txn.category,
      txn.sub_category,
      txn.amount
    );
    
    if (!categoryTotals[category]) {
      categoryTotals[category] = { total: 0, count: 0 };
    }
    
    categoryTotals[category].total += txn.amount;
    categoryTotals[category].count += 1;
  });

  const breakdown = Object.entries(categoryTotals).map(([category, data]) => ({
    category,
    monthlyAvg: Math.round(data.total / monthsOfData),
    transactionCount: data.count,
    apiKey: getCGApiKey(category as any),
  }));

  return { vector, breakdown };
}

