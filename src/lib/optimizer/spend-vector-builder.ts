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
 * @param monthsOfData How many months of data (default 1) - DEPRECATED, now auto-calculated
 */
export function buildCompleteSpendVector(
  transactions: Transaction[],
  monthsOfData: number = 1 // Keep parameter for backward compatibility, but ignore it
): CGSpendVectorComplete {
  const vector = createEmptySpendVector();
  
  // Group by category AND month to count actual months with data
  const categoryMonthMap: Record<string, Record<string, number>> = {};

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

    // Extract month from date (YYYY-MM format)
    const month = txn.date.substring(0, 7); // "2025-10-15" → "2025-10"

    const amount = txn.type === 'Dr' ? txn.amount : -txn.amount;

    // Initialize category map if needed
    if (!categoryMonthMap[category]) {
      categoryMonthMap[category] = {};
    }

    // Initialize month total if needed
    if (!categoryMonthMap[category][month]) {
      categoryMonthMap[category][month] = 0;
    }

    // Add to category-month bucket
    categoryMonthMap[category][month] += amount;
  });

  // Calculate averages for each category
  Object.entries(categoryMonthMap).forEach(([category, monthData]) => {
    // Count unique months with data for this category
    const monthsWithData = Object.keys(monthData).length;
    
    // Sum all monthly totals
    const total = Object.values(monthData).reduce((sum, amt) => sum + amt, 0);
    
    // Calculate monthly average (only for months with data)
    const monthlyAverage = total / monthsWithData;

    const apiKey = getCGApiKey(category as any);
    
    // For annual categories, multiply monthly average by 12
    if (isAnnualCategory(category)) {
      (vector as any)[apiKey] = Math.max(0, Math.round(monthlyAverage * 12));
    } else {
      (vector as any)[apiKey] = Math.max(0, Math.round(monthlyAverage));
    }
  });

  return vector;
}

/**
 * Build spend vector with category breakdown for debugging
 */
export function buildSpendVectorWithBreakdown(
  transactions: Transaction[],
  monthsOfData: number = 1 // DEPRECATED, now auto-calculated
): {
  vector: CGSpendVectorComplete;
  breakdown: {
    category: string;
    monthlyAvg: number;
    monthsWithData: number;
    transactionCount: number;
    apiKey: string;
  }[];
} {
  const vector = buildCompleteSpendVector(transactions, monthsOfData);
  
  // Build breakdown with month tracking
  const categoryData: Record<string, { 
    months: Set<string>; 
    total: number; 
    count: number 
  }> = {};
  
  transactions.forEach(txn => {
    if (txn.type === 'Cr') return;
    
    const category = mapTransactionCategory(
      txn.description,
      txn.category,
      txn.sub_category,
      txn.amount
    );
    
    const month = txn.date.substring(0, 7);
    
    if (!categoryData[category]) {
      categoryData[category] = { months: new Set(), total: 0, count: 0 };
    }
    
    categoryData[category].months.add(month);
    categoryData[category].total += txn.amount;
    categoryData[category].count += 1;
  });

  const breakdown = Object.entries(categoryData).map(([category, data]) => ({
    category,
    monthlyAvg: Math.round(data.total / data.months.size),
    monthsWithData: data.months.size,
    transactionCount: data.count,
    apiKey: getCGApiKey(category as any),
  }));

  return { vector, breakdown };
}

