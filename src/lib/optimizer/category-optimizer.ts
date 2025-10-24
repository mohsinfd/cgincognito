/**
 * Category Optimizer: Detects sub-optimal card usage at category level
 * 
 * This module compares user's current card performance against the best available
 * card for each spending category, identifying missed savings opportunities.
 */

import type { CGCardRecommendation } from '@/types/optimizer';

export type CategoryMismatchWarning = {
  type: 'category_mismatch';
  category: string;
  categoryKey: string;
  userCard: string;
  userCardId: number;
  userSpend: number;
  userSavings: number;
  bestCard: string;
  bestCardId: number;
  bestSavings: number;
  missedSavings: number;
  percentageIncrease: number;
  message: string;
};

export type CapHitWarning = {
  type: 'cap_hit';
  category: string;
  categoryKey: string;
  userCard: string;
  userCardId: number;
  monthlySpend: number;
  capAmount: number;
  totalCapAmount: number;
  excessSpend: number;
  currentSavings: number;
  message: string;
};

export type OptimizationWarning = CategoryMismatchWarning | CapHitWarning;

/**
 * Detect category-level optimization opportunities
 * 
 * @param userCardResponse - CardGenius API response for user's current card (savings[0])
 * @param bestCardResponse - CardGenius API response for best alternative card (savings[1])
 * @param thresholdAmount - Minimum missed savings to trigger warning (default: ₹500)
 * @param thresholdPercentage - Minimum percentage improvement to trigger warning (default: 20%)
 */
export function detectCategoryMismatches(
  userCardResponse: CGCardRecommendation,
  bestCardResponse: CGCardRecommendation,
  thresholdAmount: number = 500,
  thresholdPercentage: number = 20
): CategoryMismatchWarning[] {
  const warnings: CategoryMismatchWarning[] = [];
  
  // Compare each spending category
  userCardResponse.spending_breakdown_array?.forEach(userCategory => {
    // Skip if user didn't spend in this category
    if (userCategory.spend <= 0) return;
    
    // Find corresponding category in best card response
    const bestCategory = bestCardResponse.spending_breakdown_array?.find(
      cat => cat.on === userCategory.on
    );
    
    if (!bestCategory) return;
    
    // Calculate missed savings
    const missedSavings = bestCategory.savings - userCategory.savings;
    const percentageIncrease = userCategory.savings > 0
      ? (missedSavings / userCategory.savings) * 100
      : 0;
    
    // Check if this meets warning thresholds
    if (
      missedSavings >= thresholdAmount &&
      percentageIncrease >= thresholdPercentage
    ) {
      const categoryName = formatCategoryName(userCategory.on);
      
      warnings.push({
        type: 'category_mismatch',
        category: categoryName,
        categoryKey: userCategory.on,
        userCard: userCardResponse.card_name,
        userCardId: userCardResponse.id,
        userSpend: userCategory.spend,
        userSavings: userCategory.savings,
        bestCard: bestCardResponse.card_name,
        bestCardId: bestCardResponse.id,
        bestSavings: bestCategory.savings,
        missedSavings: missedSavings,
        percentageIncrease: Math.round(percentageIncrease),
        message: generateCategoryMismatchMessage(
          categoryName,
          userCardResponse.card_name,
          userCategory.savings,
          bestCardResponse.card_name,
          bestCategory.savings,
          missedSavings,
          Math.round(percentageIncrease)
        ),
      });
    }
  });
  
  // Sort by missed savings (highest first)
  return warnings.sort((a, b) => b.missedSavings - a.missedSavings);
}

/**
 * Detect cap hits on user's current card
 * Uses heuristics to group categories that likely share caps
 */
export function detectCapHits(
  userCardResponse: CGCardRecommendation,
  minCapThreshold: number = 100000 // Ignore "unlimited" caps (>100K)
): CapHitWarning[] {
  const warnings: CapHitWarning[] = [];
  
  if (!userCardResponse.spending_breakdown_array) {
    return warnings;
  }
  
  // Step 1: Group categories by potential shared caps
  const capGroups = new Map<string, typeof userCardResponse.spending_breakdown_array>();
  
  userCardResponse.spending_breakdown_array.forEach(category => {
    if (category.spend <= 0 || category.maxCap <= 0 || category.maxCap >= minCapThreshold) {
      return;
    }
    
    // Create a key for grouping: maxCap + totalMaxCap + cashback_percentage
    const groupKey = `${category.maxCap}_${category.totalMaxCap || category.maxCap}_${category.cashback_percentage || 'unknown'}`;
    
    if (!capGroups.has(groupKey)) {
      capGroups.set(groupKey, []);
    }
    capGroups.get(groupKey)!.push(category);
  });
  
  // Step 2: For each group, check if it's likely a shared cap
  capGroups.forEach((categories, groupKey) => {
    // Heuristic: If maxCap === totalMaxCap and multiple categories have same values,
    // they MIGHT share a cap
    const firstCat = categories[0];
    const isLikelySharedCap = 
      categories.length > 1 && 
      firstCat.maxCap === firstCat.totalMaxCap;
    
    if (isLikelySharedCap) {
      // Calculate total spend across all categories in group
      const totalSpend = categories.reduce((sum, cat) => sum + cat.spend, 0);
      const totalSavings = categories.reduce((sum, cat) => sum + cat.savings, 0);
      
      // Calculate max eligible spend from cap and cashback rate
      let maxEligibleSpend = firstCat.maxCap; // Default to cap amount
      if (firstCat.cashback_percentage) {
        const rate = parseFloat(firstCat.cashback_percentage) / 100;
        if (rate > 0) {
          maxEligibleSpend = firstCat.maxCap / rate;
        }
      }
      
      // Check if combined spending exceeds eligible amount
      if (totalSpend > maxEligibleSpend) {
        const excessSpend = totalSpend - maxEligibleSpend;
        const categoryNames = categories.map(c => formatCategoryName(c.on));
        
        warnings.push({
          type: 'cap_hit',
          category: categoryNames.join(', '),
          categoryKey: categories.map(c => c.on).join(','),
          userCard: userCardResponse.card_name,
          userCardId: userCardResponse.id,
          monthlySpend: totalSpend,
          capAmount: firstCat.maxCap,
          totalCapAmount: firstCat.totalMaxCap || firstCat.maxCap,
          excessSpend: excessSpend,
          currentSavings: totalSavings,
          message: generateSharedCapHitMessage(
            categoryNames,
            userCardResponse.card_name,
            totalSpend,
            maxEligibleSpend,
            firstCat.maxCap,
            excessSpend,
            firstCat.cashback_percentage
          ),
        });
      }
    } else {
      // Not a shared cap - process each category individually
      categories.forEach(category => {
        // Calculate max eligible spend
        let maxEligibleSpend = category.maxCap;
        if (category.cashback_percentage) {
          const rate = parseFloat(category.cashback_percentage) / 100;
          if (rate > 0) {
            maxEligibleSpend = category.maxCap / rate;
          }
        }
        
        if (category.spend > maxEligibleSpend) {
          const excessSpend = category.spend - maxEligibleSpend;
          const categoryName = formatCategoryName(category.on);
          
          warnings.push({
            type: 'cap_hit',
            category: categoryName,
            categoryKey: category.on,
            userCard: userCardResponse.card_name,
            userCardId: userCardResponse.id,
            monthlySpend: category.spend,
            capAmount: category.maxCap,
            totalCapAmount: category.totalMaxCap || category.maxCap,
            excessSpend: excessSpend,
            currentSavings: category.savings,
            message: generateCapHitMessage(
              categoryName,
              userCardResponse.card_name,
              category.spend,
              maxEligibleSpend,
              category.maxCap,
              excessSpend,
              category.cashback_percentage
            ),
          });
        }
      });
    }
  });
  
  // Sort by excess spend (highest first)
  return warnings.sort((a, b) => b.excessSpend - a.excessSpend);
}

/**
 * Detect all optimization opportunities for a user's card
 */
export function detectAllOptimizations(
  userCardResponse: CGCardRecommendation,
  bestCardResponse: CGCardRecommendation
): OptimizationWarning[] {
  const categoryMismatches = detectCategoryMismatches(userCardResponse, bestCardResponse);
  const capHits = detectCapHits(userCardResponse);
  
  return [...categoryMismatches, ...capHits];
}

/**
 * Format category key to human-readable name
 */
function formatCategoryName(categoryKey: string): string {
  // Remove underscores and capitalize words
  return categoryKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate user-friendly message for category mismatch
 */
function generateCategoryMismatchMessage(
  category: string,
  userCard: string,
  userSavings: number,
  bestCard: string,
  bestSavings: number,
  missedSavings: number,
  percentageIncrease: number
): string {
  return `You used ${userCard} for ${category} and earned ₹${userSavings.toLocaleString()}. ` +
    `If you had used ${bestCard} instead, you would have earned ₹${bestSavings.toLocaleString()}. ` +
    `Missed savings: ₹${missedSavings.toLocaleString()} (${percentageIncrease}% more rewards!)`;
}

/**
 * Generate user-friendly message for cap hit (single category)
 */
function generateCapHitMessage(
  category: string,
  cardName: string,
  spend: number,
  maxEligibleSpend: number,
  capAmount: number,
  excessSpend: number,
  cashbackPercentage?: string
): string {
  const rate = cashbackPercentage ? `${cashbackPercentage}%` : '';
  return `You spent ₹${spend.toLocaleString()} on ${category} using ${cardName}, ` +
    `but this card only gives ${rate} cashback on the first ₹${maxEligibleSpend.toLocaleString()} ` +
    `(₹${capAmount.toLocaleString()} cashback cap). ` +
    `You're not earning rewards on ₹${excessSpend.toLocaleString()} of your spending.`;
}

/**
 * Generate user-friendly message for shared cap hit (multiple categories)
 */
function generateSharedCapHitMessage(
  categories: string[],
  cardName: string,
  totalSpend: number,
  maxEligibleSpend: number,
  capAmount: number,
  excessSpend: number,
  cashbackPercentage?: string
): string {
  const categoriesList = categories.length > 2 
    ? `${categories.slice(0, -1).join(', ')}, and ${categories[categories.length - 1]}`
    : categories.join(' and ');
  
  const rate = cashbackPercentage ? `${cashbackPercentage}%` : '';
  
  return `You spent ₹${totalSpend.toLocaleString()} across ${categoriesList} using ${cardName}. ` +
    `These categories likely share a combined ₹${capAmount.toLocaleString()} cashback cap ` +
    `(₹${maxEligibleSpend.toLocaleString()} eligible spend at ${rate}). ` +
    `You're not earning rewards on approximately ₹${excessSpend.toLocaleString()} of your spending.`;
}

