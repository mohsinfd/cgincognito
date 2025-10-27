# Consolidated TODO List

## Completed ✅

1. **Fix optimization flow** - Optimizer now analyzes ALL banks sequentially
2. **Fix card selection modal** - Supports multiple banks in a carousel queue
3. **Build merchant master list** - Generated 219 transaction patterns
4. **Implement pre-categorizer** - Created `pre-categorizer.ts` with regex patterns
5. **Fix duplicate statements** - Removed duplicates from localStorage
6. **Fix parsing popup** - Removed alert/confirm interruptions

## In Progress / Next ⏳

### Critical (Fix Core Functionality)

1. **Fix rent categorization** ⚠️
   - Apply CRED/Dreamplug amount-based detection (₹80k-₹95k)
   - Located in: `src/lib/mapper/complete-mapper.ts`
   - Status: Logic updated, needs re-sync to apply

2. **Verify SBI parsing** ⚠️
   - Investigate why SBI statements show 0 debit transactions
   - Possible issues: Password protection, parsing failures
   - Status: Needs investigation

### Enhancements (Cost/Speed Improvements)

3. **Integrate two-stage pipeline** 📊
   - Hook pre-categorizer into LLM processing flow
   - Send only low-confidence transactions to LLM
   - Expected savings: 60% reduction in LLM costs
   - Located in: `src/app/api/gmail/process-statements-v2/route.ts`

4. **Test categorization coverage** 🧪
   - Measure how many transactions caught by regex vs LLM
   - Validate accuracy of pre-categorizer
   - Script needed: Test against 219 transactions

## Investigation Needed 🔍

- Why only HDFC showed optimization warnings (NOW FIXED ✅)
- Why RBL was only bank requiring confirmation
- Why SBI has 0 transactions
- Card matching confidence thresholds (currently 80%)

## Notes

- Optimizer flow now processes all banks sequentially
- Card selection modal queues banks needing confirmation
- Pre-categorizer ready but not integrated yet
- Rent categorization logic updated but needs re-sync

