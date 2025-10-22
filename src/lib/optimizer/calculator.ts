/**
 * Optimizer algorithm
 * Based on PRD Section H
 */

import type {
  OptimizerInput,
  OptimizerResult,
  OptimizerFinding,
  ExplanationTag,
  CGSpendVector,
} from '@/types/optimizer';
import type { CgBucket, Txn } from '@/types/transaction';
import { cgCalculatorClient } from '@/lib/calculator/client';

/**
 * Build monthly spend vector from transactions
 * Credits reduce category totals
 */
export function buildMonthlySpendVector(transactions: Txn[]): Partial<CGSpendVector> {
  const vector: Record<string, number> = {};

  for (const txn of transactions) {
    const bucket = txn.cg_bucket;
    const amount = txn.type === 'Dr' ? txn.amount : -txn.amount;

    vector[bucket] = (vector[bucket] || 0) + amount;
  }

  // Ensure non-negative values
  for (const key in vector) {
    if (vector[key] < 0) {
      vector[key] = 0;
    }
  }

  return vector as Partial<CGSpendVector>;
}

/**
 * Map CG bucket to CGSpendVector fields
 */
const BUCKET_TO_VECTOR_FIELD: Record<CgBucket, keyof CGSpendVector> = {
  amazon_spends: 'amazon_spends',
  flipkart_spends: 'flipkart_spends',
  grocery_spends_online: 'grocery_spends_online',
  other_online_spends: 'other_online_spends',
  other_offline_spends: 'other_offline_spends',
  dining_or_going_out: 'dining_or_going_out',
  fuel: 'fuel',
  travel: 'travel',
  utilities: 'utilities',
  school_fees: 'school_fees',
  rent: 'rent',
};

/**
 * Compute optimizer result for a month
 */
export async function computeOptimizerResult(
  input: OptimizerInput
): Promise<OptimizerResult> {
  // 1. Build base monthly spend vector
  const baseVector = buildMonthlySpendVector(input.txns);

  // 2. Get recommendations for base vector
  const baseResponse = await cgCalculatorClient.getRecommendations(baseVector);
  const bestCard = baseResponse.cards[0];

  if (!bestCard) {
    throw new Error('No card recommendations returned');
  }

  const findings: OptimizerFinding[] = [];
  const categoryMissed: Record<CgBucket, number> = {} as Record<CgBucket, number>;

  // 3. For each transaction, compute delta
  for (const txn of input.txns) {
    if (txn.type === 'Cr') {
      continue; // Skip credits
    }

    // Create delta vector: remove this transaction from base
    const deltaVector = { ...baseVector };
    const field = BUCKET_TO_VECTOR_FIELD[txn.cg_bucket];
    if (field) {
      deltaVector[field] = Math.max(0, (deltaVector[field] || 0) - txn.amount);
    }

    // Get recommendations for delta vector
    const deltaResponse = await cgCalculatorClient.getRecommendations(deltaVector);
    const deltaCard = deltaResponse.cards[0];

    if (!deltaCard) continue;

    // Compute marginal reward for this transaction
    const baseReward = bestCard.reward_summary.monthly_savings_est;
    const deltaReward = deltaCard.reward_summary.monthly_savings_est;
    const marginalReward = baseReward - deltaReward;

    // Assume user used no rewards (or a default card with 0% rewards)
    // In reality, infer from txn.card_last4 if available
    const actualReward = 0;
    const deltaValue = marginalReward - actualReward;

    if (deltaValue > 0) {
      // Determine explanation tags
      const explanations = determineExplanations(txn, bestCard.card_id);

      findings.push({
        txn_id: txn.txn_id,
        actual_card: txn.card_last4 ? `*${txn.card_last4}` : undefined,
        best_card: bestCard.card_name,
        delta_value: deltaValue,
        explanation: explanations,
      });

      // Accumulate by category
      categoryMissed[txn.cg_bucket] =
        (categoryMissed[txn.cg_bucket] || 0) + deltaValue;
    }
  }

  // 4. Aggregate and produce top changes
  const totalMissed = findings.reduce((sum, f) => sum + f.delta_value, 0);

  const topChanges = generateTopChanges(findings, categoryMissed);

  return {
    month: input.month,
    total_missed: Math.round(totalMissed * 100) / 100,
    by_category: categoryMissed,
    top_changes: topChanges,
    findings: findings,
  };
}

/**
 * Determine explanation tags for a finding
 */
function determineExplanations(txn: Txn, bestCardId: string): ExplanationTag[] {
  const tags: ExplanationTag[] = [];

  // Simple heuristics - enhance with card caps/exclusions table
  
  // WRONG_CHANNEL: Online card used offline or vice versa
  if (
    (txn.cg_bucket === 'other_online_spends' && txn.vendor_cat?.includes('POS')) ||
    (txn.cg_bucket === 'other_offline_spends' && txn.vendor_cat?.includes('Online'))
  ) {
    tags.push('WRONG_CHANNEL');
  }

  // CASHBACK_CARD_MISUSE: Used a miles/points card for e-commerce
  if (
    (txn.cg_bucket === 'amazon_spends' || txn.cg_bucket === 'flipkart_spends') &&
    bestCardId.toLowerCase().includes('cashback')
  ) {
    tags.push('CASHBACK_CARD_MISUSE');
  }

  // MERCHANT_EXCLUSION: Generic flag
  if (txn.raw_desc.toLowerCase().includes('wallet')) {
    tags.push('MERCHANT_EXCLUSION');
  }

  return tags.length > 0 ? tags : ['WRONG_CHANNEL']; // Default explanation
}

/**
 * Generate top routing rule changes
 */
function generateTopChanges(
  findings: OptimizerFinding[],
  categoryMissed: Record<CgBucket, number>
): Array<{ rule: string; est_monthly_gain: number }> {
  // Group findings by best_card and category
  const cardCategoryGains: Record<string, Record<string, number>> = {};

  for (const finding of findings) {
    const card = finding.best_card;
    const category = findings.find(f => f.txn_id === finding.txn_id)?.explanation[0] || 'general';

    if (!cardCategoryGains[card]) {
      cardCategoryGains[card] = {};
    }

    cardCategoryGains[card][category] =
      (cardCategoryGains[card][category] || 0) + finding.delta_value;
  }

  // Generate rules
  const rules: Array<{ rule: string; est_monthly_gain: number }> = [];

  for (const [card, categories] of Object.entries(cardCategoryGains)) {
    const totalGain = Object.values(categories).reduce((sum, val) => sum + val, 0);
    
    // Simple rule generation
    const rule = `Use ${card} for better rewards`;
    rules.push({ rule, est_monthly_gain: Math.round(totalGain * 100) / 100 });
  }

  // Sort by gain and take top 5
  return rules
    .sort((a, b) => b.est_monthly_gain - a.est_monthly_gain)
    .slice(0, 5);
}

