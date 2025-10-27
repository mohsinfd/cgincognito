# Smart Categorization Strategy

## Problem Statement
Current categorization is too rigid - it assumes CRED/Dreamplug = rent, but users use these platforms for multiple purposes (rent, maintenance, fees, bills).

## Solution: Multi-Layer Categorization with Confidence Scoring

### Layer 1: Amount-Based Detection (High Confidence)
Transactions matching recurring expense patterns:

```typescript
const RECURRING_PATTERNS = {
  rent: { min: 80000, max: 95000, frequency: 'monthly' },
  // Add more patterns as we learn
};

function detectByAmount(description: string, amount: number): {
  category: string;
  confidence: number;
  reason: string;
} {
  // Rent: ₹80k-₹95k range
  if (amount >= 80000 && amount <= 95000) {
    // CRED/Dreamplug in this range is likely rent
    if (description.includes('cred') || description.includes('dreamplug')) {
      return {
        category: 'rent',
        confidence: 0.85,
        reason: 'Amount matches rent range + payment platform'
      };
    }
  }
  
  return null;
}
```

### Layer 2: Merchant-Based Rules (Medium Confidence)
Explicit merchant patterns:

```typescript
const MERCHANT_RULES = {
  'cred rental': { category: 'rent', confidence: 0.95 },
  'cred': { 
    category: 'rent', 
    confidence: 0.70, 
    condition: (amount) => amount >= 80000 && amount <= 95000 
  },
  'dreamplug': { 
    category: 'other_online_spends', 
    confidence: 0.60,
    requiresConfirmation: true // Flag for user review
  }
};
```

### Layer 3: User Confirmation Flow (Low Confidence)

#### When to Ask for Confirmation:
1. **Amount Anomaly**: Unusual amount for a merchant
2. **Missing Pattern**: Expected recurring expense not found
3. **Ambiguous Merchant**: Generic platform name (CRED, Dreamplug)

#### UI Flow:

```typescript
interface CategorizationQuestion {
  id: string;
  type: 'recurring_check' | 'category_confirmation' | 'missing_pattern';
  title: string;
  description: string;
  transactions: Transaction[];
  suggestions: {
    category: string;
    confidence: number;
    reasoning: string;
  }[];
}

// Example Question Types:

// 1. Recurring Check
{
  type: 'recurring_check',
  title: 'Is this a recurring expense?',
  description: 'We found monthly payments of ₹85k-₹93k through CRED. Is this your rent?',
  transactions: [/* Sep transactions */],
  suggestions: [
    { category: 'rent', confidence: 0.85, reasoning: 'Amount and frequency match rent pattern' }
  ]
}

// 2. Category Confirmation
{
  type: 'category_confirmation',
  title: 'What is this payment for?',
  description: 'We couldn\'t determine what CRED payment of ₹50k was for',
  transactions: [/* single transaction */],
  suggestions: [
    { category: 'rent', confidence: 0.70 },
    { category: 'maintenance', confidence: 0.65 },
    { category: 'other_online_spends', confidence: 0.55 }
  ]
}

// 3. Missing Pattern Alert
{
  type: 'missing_pattern',
  title: 'Missing Monthly Payment',
  description: 'We see rent payments in Aug (₹85k) and Oct (₹93k), but none in Sep',
  transactions: [],
  suggestions: [
    { category: 'manual_entry', confidence: 1.0, reasoning: 'Please confirm Sep rent was paid' }
  ]
}
```

### Implementation Plan

#### Phase 1: Smart Detection (Current)
- ✅ Amount-based rent detection
- ✅ Merchant pattern matching
- ✅ Confidence scoring

#### Phase 2: Pattern Recognition
- [ ] Learn recurring expense patterns from transaction history
- [ ] Detect anomalies (missing payments, unusual amounts)
- [ ] Frequency analysis (monthly, quarterly, annual)

#### Phase 3: User Confirmation UI
- [ ] Inline categorization feedback component
- [ ] Bulk confirmation flow for recurring expenses
- [ ] Missing transaction alert system

#### Phase 4: Learning Loop
- [ ] Store user confirmations
- [ ] Improve confidence scores based on corrections
- [ ] Personalize merchant rules per user

### Example: Rent Detection Flow

```
Transaction: "CRED" - ₹93,810.75
↓
Check Amount: ✓ 85000-95000 (rent range)
Check Merchant: ✓ CRED platform
Check History: Found similar payments in Aug/Oct
↓
Confidence: 0.85 (HIGH)
Category: rent
Action: Auto-categorize ✓
```

```
Transaction: "CRED" - ₹50,347.50
↓
Check Amount: ✗ Outside rent range
Check Merchant: ✓ CRED platform
Check History: No similar pattern
↓
Confidence: 0.60 (MEDIUM)
Category: other_online_spends
Action: Flag for review ⚠️
```

### Recurring Expense Registry

As we learn, build a registry:

```typescript
type RecurringExpense = {
  userId: string;
  category: string;
  merchant: string;
  amountRange: { min: number; max: number };
  frequency: 'monthly' | 'quarterly' | 'annually';
  confidence: number;
  lastConfirmedDate: string;
  transactionCount: number;
};

// Example
{
  userId: 'user123',
  category: 'rent',
  merchant: 'CRED',
  amountRange: { min: 85000, max: 93810 },
  frequency: 'monthly',
  confidence: 0.90,
  lastConfirmedDate: '2025-10-03',
  transactionCount: 2
}
```

### Benefits

1. **Accuracy**: Higher confidence = fewer mistakes
2. **User Control**: Low confidence items get reviewed
3. **Learning**: System improves with user feedback
4. **Transparency**: Clear reasoning for each categorization
5. **Flexibility**: Handles edge cases gracefully

