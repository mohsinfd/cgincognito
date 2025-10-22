# Recommended Prompt V3 - Best of Both Worlds

## Strategy: Keep It Simple, Add Key Improvements

### ✅ What to KEEP from Current Prompt:
- Simple JSON schema (matches our code)
- Clear Dr/Cr distinction
- Basic categorization rules
- Indian merchant examples

### ✅ What to ADD from Comprehensive Prompt:
1. **Merchant normalization rules** (remove "Ecom", "POS", "Intl", "*")
2. **Validation tracking** (add simple issues array)
3. **Better confidence scoring** (for categories)
4. **Refund detection** (simple heuristic)

### ❌ What to SKIP (for now):
- Complex totals_by_category computation (do this in frontend)
- Foreign currency handling (rare, adds complexity)
- EMI detection (can add later)
- Channel detection (hard to do accurately)

---

## Improved Prompt V3

### System Message:
```
You are an expert Indian credit card statement parser. Extract all transactions accurately, normalize merchant names by removing transaction codes and prefixes (POS*, ECOM*, INTL*, etc.), classify spending using CardGenius categories, and identify potential refunds. Always use positive amounts - type field indicates direction (debit=spending, credit=payment/refund).
```

### User Prompt:
```
Parse this Indian credit card statement and extract ALL transactions.

**Bank:** ${bankCode}

**STATEMENT TEXT:**
```
${text}
```

**CRITICAL RULES:**

1. **Transaction Types:**
   - "Dr" = Debit = SPENDING (purchases, bills, fees)
   - "Cr" = Credit = PAYMENTS/REFUNDS (money received)
   - ALL amounts must be POSITIVE numbers
   - Type field indicates direction

2. **Merchant Normalization:**
   - Remove prefixes: "POS*", "ECOM*", "INTL*", "AUTH*", "TXN*", "REF*"
   - Remove transaction IDs and alphanumeric codes
   - Keep location if present (e.g., "SWIGGY BANGALORE")
   - Examples:
     ✅ "AMAZON INDIA" (not "ECOM*AMAZON1234567TXN")
     ✅ "SWIGGY BANGALORE" (not "POS*SWIGGY890REF456")

3. **Amount Handling:**
   - Remove: ₹, $, commas, spaces
   - "₹1,234.56" → 1234.56
   - All amounts positive (type indicates direction)

4. **Date Format:**
   - Always YYYY-MM-DD
   - Infer year from statement period if needed

5. **Categorization:**
   Match merchants to these categories:
   
   - amazon_spends: Amazon.in, AMZN (NOT Amazon Pay bill payments)
   - flipkart_spends: Flipkart, FKRT
   - grocery_spends_online: Blinkit, BigBasket, Instamart, Zepto, Dunzo
   - online_food_ordering: Swiggy, Zomato, UberEats
   - dining_or_going_out: Restaurants, cafes, food courts
   - flights: IndiGo, SpiceJet, Air India, Vistara, Akasa
   - hotels: OYO, MakeMyTrip hotels, Taj, ITC, Marriott
   - fuel: HPCL, IOCL, BPCL, Shell petrol pumps
   - mobile_phone_bills: Airtel, Jio, Vi, BSNL recharges
   - electricity_bills: BSES, BESCOM, TNEB, electricity boards
   - water_bills: Water utility payments
   - ott_channels: Netflix, Prime Video, Disney+, Spotify, YouTube Premium
   - pharmacy: Apollo Pharmacy, 1mg, PharmEasy, NetMeds
   - large_electronics: >₹50,000 electronics (laptops, phones, TVs)
   - insurance_health: Health insurance premiums
   - insurance_car_or_bike: Vehicle insurance
   - school_fees: Educational institutions
   - rent: House/apartment rent
   - other_online_spends: Other e-commerce
   - other_offline_spends: Physical stores (default if unclear)

6. **Refund Detection (Optional):**
   If a credit transaction matches a previous debit:
   - Same merchant name
   - Similar amount
   - Within 30 days
   Add "is_refund": true

**OUTPUT FORMAT:**
{
  "bank": "${bankCode}",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Clean merchant name",
      "amount": 0.00,
      "type": "Dr|Cr",
      "category": "category_key",
      "confidence": 0.0-1.0,
      "is_refund": false
    }
  ],
  "issues": [
    "List any assumptions or data quality concerns"
  ]
}

**VALIDATION:**
- Extract EVERY transaction (no skipping)
- All amounts positive
- All dates YYYY-MM-DD
- All types "Dr" or "Cr"
- All categories from approved list
- Clean merchant names (no codes)
- Add confidence <0.7 if uncertain

Extract all transactions accurately. Double-check Dr vs Cr.
```

---

## Key Improvements Over Current:

1. ✅ **Merchant Normalization** - Remove POS*, ECOM*, etc.
2. ✅ **Confidence Scoring** - Track uncertainty
3. ✅ **Issues Array** - Track data quality
4. ✅ **Refund Detection** - Basic heuristic
5. ✅ **Clearer Categorization** - More merchant examples

## What We Skip (Intentionally):

1. ❌ Complex `totals_by_category` - Do in frontend
2. ❌ Foreign currency - Rare, adds complexity
3. ❌ EMI detection - Add later if needed
4. ❌ Channel detection - Hard to do accurately
5. ❌ Overly complex schema - Keep it simple

## Why This Is Better:

| Aspect | Current V2 | Comprehensive | Recommended V3 |
|--------|-----------|---------------|----------------|
| Schema Complexity | Simple ✅ | Very Complex ❌ | Medium ✅ |
| Merchant Cleaning | Basic | Excellent ✅ | Excellent ✅ |
| Categorization | Good ✅ | Good ✅ | Good ✅ |
| Refund Detection | None ❌ | Advanced ✅ | Basic ✅ |
| Data Quality | None ❌ | Excellent ✅ | Good ✅ |
| Frontend Compatibility | Yes ✅ | No ❌❌❌ | Yes ✅ |
| Token Cost | Low ✅ | High ❌ | Medium ✅ |

---

## Implementation Plan:

### Phase 1 (Now): V3 Basics
- Add merchant normalization rules
- Add confidence scoring
- Add issues array
- Keep schema compatible

### Phase 2 (Later): Advanced Features
- EMI detection
- Foreign currency
- Complex totals computation
- Channel detection

---

## Migration Path:

1. Update schema to support optional fields:
   ```typescript
   {
     confidence?: number;
     is_refund?: boolean;
   }
   ```

2. Update storage to handle issues:
   ```typescript
   {
     issues?: string[];
   }
   ```

3. Update frontend to display:
   - Low confidence transactions (for review)
   - Refunds (mark separately)
   - Data quality issues

---

## Estimated Impact:

- **Merchant Name Quality**: +40% improvement
- **Categorization Accuracy**: +15% improvement  
- **Data Quality Visibility**: +100% (now tracked)
- **Refund Detection**: New capability
- **Development Effort**: ~4 hours
- **Breaking Changes**: None (backward compatible)

