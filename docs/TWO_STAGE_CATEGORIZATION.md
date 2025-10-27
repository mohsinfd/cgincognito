# Two-Stage Categorization Pipeline

## Overview

Instead of sending ALL transactions to LLM (expensive), we use a **two-stage approach**:

1. **Stage 1: Regex Pre-Categorization** (FREE, instant)
   - Catches obvious merchants (Amazon, Swiggy, Blinkit, etc.)
   - 95% confidence → use directly, skip LLM
   - ~60% of transactions caught here

2. **Stage 2: LLM Fallback** (costs ₹0.30/statement)
   - Only processes transactions without confident regex match
   - ~40% of transactions reach LLM
   - **Cost savings: 60%**

## Flow Diagram

```
Transaction → Pre-Categorizer → LLM?
                ↓                    ↓
            Confident?          Ambiguous
                ↓                    ↓
            Use It ✓         Send to LLM
                                         ↓
                                    Get Category
```

## Why This Works

### Your Data Shows:
- **HIGH CONFIDENCE** merchants (from your 219 transactions):
  - Amazon: 5 unique patterns
  - Swiggy: 15 unique patterns  
  - Blinkit: 7 unique patterns
  - Zomato: 15 unique patterns
  - Flipkart: 4 unique patterns
  
- **MEDIUM CONFIDENCE** (amount-based):
  - Rent: ₹80k-₹95k through CRED/Dreamplug
  - Large electronics: >₹50k

- **LOW CONFIDENCE** (send to LLM):
  - Unknown merchants
  - Generic descriptions
  - Edge cases

## Implementation

### Step 1: Pre-Categorize (In `pre-categorizer.ts`)

```typescript
export function preCategorize(description: string, amount?: number): PreCategoryResult {
  const desc = description.toLowerCase();
  
  // HIGH CONFIDENCE (95%) - Skip LLM
  if (desc.includes('amazon')) return { category: 'amazon_spends', confidence: 0.95 };
  if (desc.includes('swiggy')) return { category: 'online_food_ordering', confidence: 0.95 };
  if (desc.includes('blinkit')) return { category: 'grocery_spends_online', confidence: 0.95 };
  
  // MEDIUM CONFIDENCE (85%) - Rent pattern
  if (amount >= 80000 && amount <= 95000 && desc.includes('cred')) {
    return { category: 'rent', confidence: 0.85 };
  }
  
  // NO MATCH - Send to LLM
  return { category: null, confidence: 0 };
}
```

### Step 2: Conditional LLM Processing

```typescript
// In process-statements-v2/route.ts

transactions.forEach(txn => {
  // Pre-categorize first
  const preCat = preCategorize(txn.description, txn.amount);
  
  if (preCat.confidence >= 0.95) {
    // High confidence - use regex result
    txn.category = preCat.category;
    txn.skipLLM = true; // Flag to skip LLM
  } else {
    // Low confidence - let LLM handle it
    txn.skipLLM = false;
  }
});

// LLM only processes transactions where skipLLM = false
```

## Cost Analysis

### Current Approach (100% LLM):
- Cost per statement: ₹0.30
- 24 statements/month: ₹7.20/month
- **Total: ₹7.20**

### Two-Stage Approach:
- Regex (60%): ₹0.00
- LLM (40%): ₹0.30 × 0.4 = ₹0.12
- 24 statements/month: ₹2.88/month
- **Total: ₹2.88**
- **Savings: 60% (₹4.32/month)**

## Benefits

1. **Cost**: 60% reduction in LLM costs
2. **Speed**: Regex is instant (<1ms), LLM takes 1-2s
3. **Accuracy**: Deterministic patterns (Amazon = amazon_spends, always)
4. **Maintainability**: Easy to add new patterns
5. **Scalability**: Works for millions of transactions

## Adding New Patterns

```typescript
// Add to pre-categorizer.ts

// New merchant detected? Add pattern:
if (desc.includes('newmerchant')) {
  return { category: 'appropriate_category', confidence: 0.95 };
}
```

## Testing

```typescript
// Test script to verify coverage
preCategorize('AMAZON INDIA', 1000) // amazon_spends, 95%
preCategorize('SWIGGY BANGALORE', 500) // online_food_ordering, 95%
preCategorize('CRED', 90000) // rent, 85%
preCategorize('UNKNOWN MERCHANT', 1000) // null, 0% (send to LLM)
```

## Future: Learning System

As we learn from LLM corrections:
1. Add corrected patterns to pre-categorizer
2. Increase coverage from 60% → 70% → 80%
3. Further reduce LLM costs

