/**
 * Cap Detection System
 * Identifies when users hit spending caps on cards
 */

import type { CGCardRecommendation } from '@/types/optimizer';

export type CapWarning = {
  category: string;
  spend: number;
  cap: number;
  actualSavings: number;
  potentialSavings: number;
  lostSavings: number;
  cashbackPercentage: string;
};

/**
 * Detect cap warnings from card recommendations
 * A cap is "hit" when: spend > cap AND savings are less than potential
 */
export function detectCapWarnings(cards: CGCardRecommendation[]): CapWarning[] {
  if (!cards || cards.length === 0) return [];
  
  const warnings: CapWarning[] = [];
  const topCard = cards[0]; // Analyze user's best recommended card
  
  if (!topCard.spending_breakdown_array) return [];
  
  topCard.spending_breakdown_array.forEach(breakdown => {
    // Skip if no cap defined or no spend
    if (!breakdown.maxCap || breakdown.maxCap === 0 || breakdown.spend === 0) {
      return;
    }
    
    const cashbackRate = parseFloat(breakdown.cashback_percentage) / 100;
    const potentialSavings = Math.round(breakdown.spend * cashbackRate);
    const actualSavings = breakdown.savings;
    
    // If user spent more than cap and didn't get full potential savings
    if (breakdown.spend > breakdown.maxCap && actualSavings < potentialSavings) {
      const lostSavings = Math.round((breakdown.spend - breakdown.maxCap) * cashbackRate);
      
      // Only warn if lost savings is meaningful (> ₹100)
      if (lostSavings > 100) {
        warnings.push({
          category: breakdown.on,
          spend: breakdown.spend,
          cap: breakdown.maxCap,
          actualSavings,
          potentialSavings,
          lostSavings,
          cashbackPercentage: breakdown.cashback_percentage
        });
      }
    }
  });
  
  return warnings.sort((a, b) => b.lostSavings - a.lostSavings); // Sort by highest lost savings
}

