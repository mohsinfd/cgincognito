# 🐛 Amount Parsing Bug Fix - Paise vs Rupees

## Problem Found

The LLM was returning amounts in **PAISE** instead of **RUPEES**, causing transactions to be 100x too large!

### Real Examples from HDFC Statement:

| Description | LLM Returned (Paise) | Should Be (Rupees) |
|-------------|---------------------|-------------------|
| KOBY S BLACKWATER COFFEE | ₹281,194 | ₹2,811.94 |
| KIERAYA FURNISHING | ₹2,208,399.24 | ₹22,083.99 (still seems high) |

**Impact:** Statement showed ₹24.95 LAKH instead of ~₹25K!

## Root Cause

Indian bank statements sometimes display amounts in paise format (e.g., "220839924" paise = ₹22,08,399.24). The LLM was parsing these numbers literally without converting to rupees.

## The Fix

Updated the LLM prompt in `src/app/api/gmail/process-statements-v2/route.ts` to:

1. **Explicitly state** amounts must be in RUPEES, not paise
2. **Instruct** to divide by 100 if amounts appear in paise format
3. **Add sanity check** examples (coffee should be ₹200-500, not ₹200,000)

### Changes Made:

```typescript
// OLD PROMPT:
3. **Amount Handling:**
   - ALL amounts must be POSITIVE numbers (no negative signs)
   - Remove currency symbols, commas, and spaces from amounts
   - Example: "₹1,234.56" should become 1234.56

// NEW PROMPT:
3. **Amount Handling - CRITICAL:**
   - ALL amounts must be in RUPEES (₹), NOT paise
   - ALL amounts must be POSITIVE numbers (no negative signs)
   - The "type" field (Dr/Cr) indicates the transaction direction
   - Remove currency symbols, commas, and spaces from amounts
   - **IMPORTANT**: If the statement shows amounts in paise (e.g., "220839924" for ₹22,08,399.24), divide by 100 to convert to rupees
   - Example: "₹1,234.56" should become 1234.56
   - Example: If you see "12345" for a small purchase, it's likely "12345 paise" = ₹123.45
   - **Sanity check**: A coffee should be ₹200-500, not ₹200,000!
```

## Action Required

### 1. Clear Bad Data
```javascript
// In browser console:
localStorage.removeItem('cardgenius_statements');
console.log('✅ Cleared statements with wrong amounts');
```

### 2. Re-sync Statements
1. Go to http://localhost:3000/gmail-test
2. Click "Search Statements"
3. Fill in user details
4. Process all statements

### 3. Verify Amounts
After re-sync, run this in browser console:

```javascript
const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
const hdfcBig = statements.find(s => s.bankCode === 'hdfc' && s.totalAmount > 100000);

if (hdfcBig) {
  console.log('HDFC Total:', hdfcBig.totalAmount);
  const txns = hdfcBig.content?.content?.transactions || [];
  
  txns.forEach((t, i) => {
    if (t.amount > 10000) {
      console.log(`⚠️  Large: ${t.description} - ₹${t.amount}`);
    }
  });
  
  if (hdfcBig.totalAmount > 100000) {
    console.error('❌ STILL WRONG - Amounts still too high!');
  } else {
    console.log('✅ Looks reasonable now!');
  }
}
```

### 4. Expected Results

After fix, HDFC statement should show:
- **Total: ~₹25,000-30,000** (not ₹24.95 lakh)
- KOBY COFFEE: ~₹2,812 (not ₹2.81 lakh)
- KIERAYA: ~₹8,400 (not ₹22 lakh) - **assuming the statement actually shows ₹8,399.24**

## Files Changed
- `src/app/api/gmail/process-statements-v2/route.ts` (lines 283-291)

## Notes

1. **This only affects NEW syncs** - old data in localStorage is still wrong
2. **The LLM should now correctly parse** amounts in either format (rupees or paise)
3. **If amounts are still wrong after re-sync**, we may need to add post-processing validation

## Verification Checklist

After re-sync:
- [ ] Dashboard total is ~₹3-5 lakh (not ₹30 lakh)
- [ ] No single transaction > ₹100,000 (unless it's a real large purchase)
- [ ] Coffee/food transactions are ₹200-3,000 range
- [ ] Rent/furniture is ₹5,000-15,000 range
- [ ] All amounts look reasonable for the merchant type

---

**Status:** 🟢 Fix applied, awaiting re-sync

