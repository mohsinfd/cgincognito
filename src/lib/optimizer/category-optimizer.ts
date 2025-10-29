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
  capAmount: number; // Cap amount in rupees (converted if rewards card)
  capAmountInPoints?: number; // Original cap in points (only for rewards cards)
  totalCapAmount: number; // Total cap in rupees
  excessSpend: number;
  currentSavings: number;
  isRewardsCard?: boolean; // True if this is a rewards card
  convRate?: number; // Conversion rate (e.g., 0.65 = 1 RP = ₹0.65)
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
      
      // Calculate max eligible spend from cap
      // For rewards cards: maxCap is in points, convert to rupees using conv_rate
      // For cashback cards: maxCap is already in rupees
      let maxCapInRupees = firstCat.maxCap;
      if (firstCat.conv_rate && firstCat.conv_rate > 0) {
        // Rewards card: convert points to rupees
        maxCapInRupees = firstCat.maxCap * firstCat.conv_rate;
      }
      // Note: If no conv_rate, it's a cashback card and maxCap is already in rupees
      
      // Calculate max eligible spend from cap (for cap calculation, not for display)
      let maxEligibleSpend = maxCapInRupees;
      if (firstCat.cashback_percentage) {
        const rate = parseFloat(firstCat.cashback_percentage) / 100;
        if (rate > 0) {
          maxEligibleSpend = maxCapInRupees / rate;
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
          capAmount: maxCapInRupees, // Store converted value in rupees
          capAmountInPoints: firstCat.conv_rate ? firstCat.maxCap : undefined, // Original points for rewards cards
          totalCapAmount: firstCat.totalMaxCap ? (firstCat.conv_rate ? firstCat.totalMaxCap * (firstCat.conv_rate || 1) : firstCat.totalMaxCap) : maxCapInRupees,
          excessSpend: excessSpend,
          currentSavings: totalSavings,
          isRewardsCard: !!firstCat.conv_rate,
          convRate: firstCat.conv_rate,
          message: generateSharedCapHitMessage(
            categoryNames,
            userCardResponse.card_name,
            totalSpend,
            maxEligibleSpend,
            maxCapInRupees,
            firstCat.maxCap, // Original maxCap (points or rupees)
            excessSpend,
            firstCat.cashback_percentage,
            firstCat.conv_rate
          ),
        });
      }
    } else {
      // Not a shared cap - process each category individually
      categories.forEach(category => {
        // Calculate max eligible spend from cap
        // For rewards cards: maxCap is in points, convert to rupees using conv_rate
        // For cashback cards: maxCap is already in rupees
        let maxCapInRupees = category.maxCap;
        if (category.conv_rate && category.conv_rate > 0) {
          // Rewards card: convert points to rupees
          maxCapInRupees = category.maxCap * category.conv_rate;
        }
        // Note: If no conv_rate, it's a cashback card and maxCap is already in rupees
        
        // Calculate max eligible spend from cap (for cap calculation, not for display)
        let maxEligibleSpend = maxCapInRupees;
        if (category.cashback_percentage) {
          const rate = parseFloat(category.cashback_percentage || '0') / 100;
          if (rate > 0) {
            maxEligibleSpend = maxCapInRupees / rate;
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
          capAmount: maxCapInRupees, // Store converted value in rupees
          capAmountInPoints: category.conv_rate ? category.maxCap : undefined, // Original points for rewards cards
          totalCapAmount: category.totalMaxCap ? (category.conv_rate ? category.totalMaxCap * (category.conv_rate || 1) : category.totalMaxCap) : maxCapInRupees,
          excessSpend: excessSpend,
          currentSavings: category.savings,
          isRewardsCard: !!category.conv_rate,
          convRate: category.conv_rate,
          message: generateCapHitMessage(
            categoryName,
            userCardResponse.card_name,
            category.spend,
            maxEligibleSpend,
            maxCapInRupees,
            category.maxCap, // Original maxCap (points or rupees)
            excessSpend,
            category.cashback_percentage,
            category.conv_rate
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
  capAmountInRupees: number,
  capAmountOriginal: number, // Original maxCap (points or rupees)
  excessSpend: number,
  cashbackPercentage?: string,
  convRate?: number
): string {
  const isRewardsCard = !!convRate;
  const rate = cashbackPercentage ? `${cashbackPercentage}%` : '';
  
  if (isRewardsCard) {
    // Rewards card: cap is in points
    return `You spent ₹${spend.toLocaleString()} on ${category} using ${cardName}, ` +
      `but this card only gives rewards on the first ₹${maxEligibleSpend.toLocaleString()} ` +
      `(${capAmountOriginal.toLocaleString()} reward points cap = ₹${capAmountInRupees.toLocaleString()}). ` +
      `You're not earning rewards on ₹${excessSpend.toLocaleString()} of your spending.`;
  } else {
    // Cashback card: cap is in rupees
    return `You spent ₹${spend.toLocaleString()} on ${category} using ${cardName}, ` +
      `but this card only gives ${rate} cashback on the first ₹${maxEligibleSpend.toLocaleString()} ` +
      `(₹${capAmountInRupees.toLocaleString()} cashback cap). ` +
      `You're not earning rewards on ₹${excessSpend.toLocaleString()} of your spending.`;
  }
}

/**
 * Generate user-friendly message for shared cap hit (multiple categories)
 */
function generateSharedCapHitMessage(
  categories: string[],
  cardName: string,
  totalSpend: number,
  maxEligibleSpend: number,
  capAmountInRupees: number,
  capAmountOriginal: number, // Original maxCap (points or rupees)
  excessSpend: number,
  cashbackPercentage?: string,
  convRate?: number
): string {
  const categoriesList = categories.length > 2 
    ? `${categories.slice(0, -1).join(', ')}, and ${categories[categories.length - 1]}`
    : categories.join(' and ');
  
  const isRewardsCard = !!convRate;
  const rate = cashbackPercentage ? `${cashbackPercentage}%` : '';
  
  if (isRewardsCard) {
    // Rewards card: cap is in points
    return `You spent ₹${totalSpend.toLocaleString()} across ${categoriesList} using ${cardName}. ` +
      `These categories likely share a combined ${capAmountOriginal.toLocaleString()} reward points cap ` +
      `(₹${maxEligibleSpend.toLocaleString()} eligible spend = ₹${capAmountInRupees.toLocaleString()} value). ` +
      `You're not earning rewards on approximately ₹${excessSpend.toLocaleString()} of your spending.`;
  } else {
    // Cashback card: cap is in rupees
    return `You spent ₹${totalSpend.toLocaleString()} across ${categoriesList} using ${cardName}. ` +
      `These categories likely share a combined ₹${capAmountInRupees.toLocaleString()} cashback cap ` +
      `(₹${maxEligibleSpend.toLocaleString()} eligible spend at ${rate}). ` +
      `You're not earning rewards on approximately ₹${excessSpend.toLocaleString()} of your spending.`;
  }
}

