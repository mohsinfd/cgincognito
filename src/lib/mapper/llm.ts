/**
 * LLM-based category mapping fallback
 * Based on PRD Section G2
 */

import type { CgBucket } from '@/types/transaction';

const CG_BUCKETS: CgBucket[] = [
  'amazon_spends',
  'flipkart_spends',
  'grocery_spends_online',
  'other_online_spends',
  'other_offline_spends',
  'dining_or_going_out',
  'fuel',
  'travel',
  'utilities',
  'school_fees',
  'rent',
];

/**
 * LLM prompt for transaction categorization
 */
export const LLM_CATEGORIZATION_PROMPT = `You map Indian credit card transactions to CardGenius buckets.

Available buckets:
- amazon_spends: Amazon purchases (not bill payments)
- flipkart_spends: Flipkart purchases
- grocery_spends_online: Online grocery (Blinkit, Instamart, BigBasket, Zepto)
- other_online_spends: Other online shopping
- other_offline_spends: In-store/POS purchases
- dining_or_going_out: Restaurants, food delivery (Swiggy, Zomato)
- fuel: Petrol pumps (HPCL, IOCL, BPCL, etc.)
- travel: Airlines, trains, taxis, hotels
- utilities: Electricity, water, gas, mobile, broadband, DTH
- school_fees: Education fees, tuition
- rent: Rent payments, housing

Instructions:
1. Analyze the transaction description
2. If confidence ≥ 0.7, output the bucket name only
3. If confidence < 0.7, output "other_offline_spends"
4. Consider the online/offline hint if provided

Output only the bucket name, nothing else.`;

/**
 * Call LLM to categorize a transaction
 * This is a placeholder - integrate with your LLM provider (OpenAI, Anthropic, etc.)
 * 
 * @param description Transaction description
 * @param amount Transaction amount
 * @param onlineHint Optional online/offline hint
 * @returns Predicted CG bucket
 */
export async function categorizeBucketWithLLM(
  description: string,
  amount: number,
  onlineHint?: 'online' | 'offline'
): Promise<CgBucket> {
  // TODO: Implement actual LLM call
  // For now, return fallback
  
  const userPrompt = `Description: "${description}"
Amount: ${amount.toFixed(2)}
${onlineHint ? `Online/Offline hint: ${onlineHint}` : ''}`;

  try {
    // Example integration with OpenAI:
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4',
    //   messages: [
    //     { role: 'system', content: LLM_CATEGORIZATION_PROMPT },
    //     { role: 'user', content: userPrompt },
    //   ],
    //   temperature: 0.1,
    //   max_tokens: 50,
    // });
    // 
    // const bucket = response.choices[0]?.message?.content?.trim();
    // if (bucket && CG_BUCKETS.includes(bucket as CgBucket)) {
    //   return bucket as CgBucket;
    // }

    // Fallback
    return onlineHint === 'online' ? 'other_online_spends' : 'other_offline_spends';
  } catch (error) {
    console.error('LLM categorization failed:', error);
    return onlineHint === 'online' ? 'other_online_spends' : 'other_offline_spends';
  }
}

/**
 * Hybrid mapping: try deterministic rules first, then LLM
 * @param vendorCat Vendor category
 * @param description Raw description
 * @param amount Amount
 * @param isOnline Online/offline hint
 * @returns CG bucket
 */
export async function mapBucketHybrid(
  vendorCat: string | undefined,
  description: string,
  amount: number,
  isOnline?: boolean
): Promise<CgBucket> {
  // Import here to avoid circular dependency
  const { mapBucketDeterministic } = await import('./rules');
  
  const deterministicMatch = mapBucketDeterministic(vendorCat, description, isOnline);
  
  if (deterministicMatch) {
    return deterministicMatch;
  }

  // Fallback to LLM only if vendor_cat is blank
  if (!vendorCat || vendorCat.trim() === '') {
    const onlineHint = isOnline === true ? 'online' : isOnline === false ? 'offline' : undefined;
    return await categorizeBucketWithLLM(description, amount, onlineHint);
  }

  // Final fallback
  return isOnline ? 'other_online_spends' : 'other_offline_spends';
}

