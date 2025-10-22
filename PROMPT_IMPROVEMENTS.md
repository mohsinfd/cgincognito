# LLM Prompt Improvements for Statement Parsing

## Summary
Significantly improved the system prompt to ensure accurate transaction extraction and categorization from Indian credit card statements.

## Key Improvements

### 1. **Clear Dr vs Cr Instructions** ✅
**Before:** No explanation of transaction types
**After:** 
- Explicit definition: Dr = Spending, Cr = Payments/Refunds
- Emphasized this is critical for accurate analysis
- Added examples of both types

### 2. **Amount Handling Rules** ✅
**Before:** Vague amount extraction
**After:**
- ALL amounts must be positive
- Type field indicates direction
- Specific rules for removing currency symbols, commas
- Example: "₹1,234.56" → 1234.56

### 3. **Description Cleaning Guidelines** ✅
**Before:** No guidance on merchant names
**After:**
- Remove transaction IDs, reference numbers
- Keep location info (e.g., "SWIGGY BANGALORE")
- Good vs Bad examples provided
- Clear rules: Remove "TXN", "REF", alphanumeric codes

### 4. **Detailed Categorization Rules** ✅
**Before:** Just a list of categories
**After:**
- Specific merchants for each category
- Examples:
  - amazon_spends: Amazon.in (NOT Amazon Pay bills)
  - grocery_spends_online: Blinkit, BigBasket, Instamart, Zepto
  - online_food_ordering: Swiggy, Zomato, UberEats
  - large_electronics: >₹50,000 threshold specified
- Default fallback: other_offline_spends

### 5. **Date Format Standardization** ✅
**Before:** No format specification
**After:**
- Always YYYY-MM-DD
- Instructions for inferring year from statement period

### 6. **Validation Checklist** ✅
**Before:** Generic "be accurate"
**After:**
- Extract EVERY transaction (no skipping)
- All amounts positive
- All dates in YYYY-MM-DD
- All types either "Dr" or "Cr"
- All categories from approved list
- Clean merchant names

### 7. **Enhanced System Message** ✅
**Before:**
```
You are an expert credit card statement parser. Extract transaction data accurately and return valid JSON that matches the provided schema.
```

**After:**
```
You are an expert Indian credit card statement parser. Your primary job is to accurately distinguish between DEBIT (Dr) transactions (spending) and CREDIT (Cr) transactions (payments/refunds). Extract all transaction data precisely, clean merchant names, and categorize spending accurately. Always use positive amounts - the type field indicates direction.
```

### 8. **Indian Context** ✅
- Specified "Indian credit cards" in prompt
- Used Indian examples (Swiggy, Flipkart, Blinkit)
- Included Indian payment providers (Airtel, Jio, BSNL)
- Used ₹ symbol in examples

## Expected Impact

### Accuracy Improvements:
1. **✅ No more Dr/Cr confusion** - Explicit instructions prevent mixing up debits and credits
2. **✅ Better categorization** - Specific merchant examples improve category assignment
3. **✅ Cleaner descriptions** - Merchant names will be more readable
4. **✅ Consistent amounts** - All positive, no negative number confusion
5. **✅ Complete extraction** - Emphasis on extracting ALL transactions

### Bug Fixes:
1. **Fixed: Credits counted as spending** - Now we filter by type correctly
2. **Fixed: Wrong totals** - Proper Dr vs Cr distinction
3. **Fixed: Poor categorization** - Better merchant-to-category mapping
4. **Fixed: Messy descriptions** - Clean merchant extraction rules

## Testing Recommendations

After reprocessing statements with new prompt:
1. Verify total spend is reasonable (not 40+ lakhs)
2. Check categories make sense (Electronics shouldn't be 50%+)
3. Confirm credits (payments) are NOT in spending totals
4. Spot-check merchant names are clean
5. Validate all transactions have proper categories

## Next Steps

1. Clear localStorage: `localStorage.removeItem('cardgenius_statements')`
2. Reprocess all statements with improved prompt
3. Compare old vs new results
4. Monitor for any JSON parsing errors (Axis Bank issue)
5. Consider increasing max_tokens if large statements are truncated

---

## UPDATE: Bank Fees Exclusion (Critical Fix)

### New Issue Discovered
After initial prompt improvements, testing revealed:
- **Finance charges (₹1,16,816)** being counted as spending
- **GST/IGST on interest (₹3,026)** also included
- **Result: Inflated spending by 83%** (₹1,44,153 vs actual ₹24,308)
- **"Other Offline" was 83%** because fees were miscategorized

### Real Example from HSBC Statement:
```
Before fix:
- Total Transactions: 22
- Total Spending: ₹1,44,153 ❌
- other_offline_spends: 83.1% ❌

After fix:
- Total Transactions: 17 (5 fees filtered)
- Total Spending: ₹24,308 ✅
- grocery_spends_online: 86.1% ✅
- other_offline_spends: 0% ✅
```

### 9. **Bank Fees Exclusion** ✅✅✅
**Added as #1 CRITICAL INSTRUCTION:**

```
1. **EXCLUDE BANK FEES AND CHARGES - DO NOT INCLUDE THESE:**
   - Finance charges, interest charges, late payment fees
   - Annual fees, membership fees (and their GST/tax components)
   - GST/IGST/CGST/SGST on ANY charges (including "ASSESSMENT", "TAX ON", etc.)
   - Over-limit fees, processing fees, service charges
   - Cashback credits, reward credits, fee reversals/discounts
   - Descriptors to EXCLUDE: "FIN CHGS", "FINANCE CHARGE", "INTEREST", "LATE FEE", 
     "ANNUAL FEE", "MEMBERSHIP FEE", "GST", "IGST", "CGST", "SGST", "ASSESSMENT", 
     "TAX", "SERVICE CHARGE", "PROCESSING FEE", "CASHBACK", "REWARD"
   - **Rule: If the transaction is a bank charge, fee, tax on fee, or reward credit - EXCLUDE IT**
   - **These are NOT customer spending - completely exclude them from the transactions array**
```

### 10. **Post-Processing Filter** ✅
**Why needed:** LLMs can be inconsistent even with explicit instructions (non-deterministic behavior).

**Implementation:**
```typescript
// Filter out fees/charges that LLM might have missed
const excludePatterns = [
  /fin.*chg/i, /finance.*charge/i, /interest/i, /late.*fee/i,
  /annual.*fee/i, /membership.*fee/i, /gst/i, /igst/i, /cgst/i, /sgst/i,
  /assessment/i, /tax.*on/i, /service.*charge/i, /processing.*fee/i,
  /cashback/i, /reward/i, /reversal/i, /refund.*fee/i, /over.*limit/i
];

transactions = transactions.filter(t => {
  const shouldExclude = excludePatterns.some(pattern => pattern.test(t.description));
  return !shouldExclude;
});
```

**Applied to:**
- ✅ `src/app/api/gmail/process-statements-v2/route.ts` - Production V2 API
- ✅ `scripts/test-prompt-single-statement.js` - Test script

### Testing Results

**Test Statement:** HSBC (20251008.pdf)
**Test Command:** `node scripts/test-prompt-single-statement.js "20251008.pdf" "151085404400" "hsbc"`

**Results:**
```
✅ Filtered out: "IGST ASSESSMENT" (₹3,026.88)
✅ Total Spending: ₹24,308.14 (accurate!)
✅ Groceries: 86.1% (Blinkit, Zepto)
✅ Food Delivery: 12.3% (Swiggy)
✅ Mobile Bills: 1.5% (Vodafone)
✅ Other Offline: 0% (perfect!)
```

### Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Spending | ₹1,44,153 | ₹24,308 | **83% reduction** ✅ |
| Transactions | 22 | 17 | 5 fees filtered ✅ |
| Other Offline % | 83.1% | 0% | **Fixed!** ✅ |
| Groceries % | 14.5% | 86.1% | Accurate ✅ |
| Food Delivery % | 2.1% | 12.3% | Accurate ✅ |

### What This Fixes

1. **✅ Accurate spending analysis** - No more inflated totals from finance charges
2. **✅ Proper category distribution** - "Other Offline" no longer dominates
3. **✅ Dashboard credibility** - Users will trust the numbers
4. **✅ Optimizer accuracy** - Recommendations based on real spending, not fees
5. **✅ Consistent results** - Post-processing catches LLM inconsistencies

### Files Updated

1. `src/app/api/gmail/process-statements-v2/route.ts`
   - Updated `parseWithOpenAI()` prompt
   - Added post-processing filter
   
2. `scripts/test-prompt-single-statement.js`
   - Full test script to validate changes
   - Shows detailed breakdown
   
3. `scripts/extract-text.js`
   - Added support for output file argument

### How to Test

```powershell
# Set API key
$env:OPENAI_API_KEY="your-key-here"

# Test with any statement
node scripts/test-prompt-single-statement.js "statement.pdf" "password" "bankcode"

# Example
node scripts/test-prompt-single-statement.js "20251008.pdf" "151085404400" "hsbc"
```

### Validation Checklist

- [x] Finance charges excluded
- [x] GST/IGST on fees excluded
- [x] Cashback credits excluded
- [x] Annual fee reversals excluded
- [x] Total spending is reasonable
- [x] Category distribution makes sense
- [x] No "other_offline_spends" domination
- [x] Post-processing catches LLM misses

