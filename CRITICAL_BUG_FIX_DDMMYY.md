# 🚨 Critical Bug Fix: DDMMYY Extraction

## The Problem

**User's actual password:** `151085404400`  
**What we generated:** `151019404400`  
**Result:** ❌ FAILED to unlock HSBC statement

## Root Cause

We were extracting DDMMYY incorrectly from DDMMYYYY format:

```typescript
// ❌ WRONG (before):
const ddmmyy = dob.substring(0, 6); // "15101985" → "151019"

// ✅ CORRECT (after):
const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // "15101985" → "151085"
```

### Why This Happened

Given DOB: `15101985` (15th October 1985)
- Position 0-1: `15` (DD - day)
- Position 2-3: `10` (MM - month)
- Position 4-7: `1985` (YYYY - year)

**Wrong logic:**
- `substring(0, 6)` = characters 0-5 = `151019` ❌
- This gives us DD + MM + "19" (first 2 chars of year)

**Correct logic:**
- `substring(0, 4)` = `1510` (DD + MM)
- `substring(6, 8)` = `85` (last 2 chars of year)
- Combined = `151085` ✅

## What Was Fixed

### 1. Targeted DOB Attempts (Line 481-486)
```typescript
// In generateTargetedAttempts() > case 'dob':
if (dob.length === 8) {
  // DDMMYY = DD + MM + last 2 digits of YYYY
  const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // "15101985" → "151085"
  attempts.push({ password: ddmmyy, source: 'targeted-dob-ddmmyy' });
  attempts.push({ password: dob.substring(0, 4), source: 'targeted-dob-ddmm' });
}
```

### 2. HSBC Combination (Line 575-578)
```typescript
// HSBC: DDMMYY + last 6 digits
const dobYY = userDetails.dob.length === 8 
  ? userDetails.dob.substring(0, 4) + userDetails.dob.substring(6, 8) 
  : userDetails.dob;
```

### 3. General DOB Attempts (Line 336-339)
```typescript
// In generatePasswordAttempts() > DOB variations
if (dob.length === 8) {
  attempts.push({ password: dob, source: 'dob-full' });
  // DDMMYY = DD + MM + last 2 of YYYY (e.g., "15101985" → "151085")
  attempts.push({ password: dob.substring(0, 4) + dob.substring(6, 8), source: 'dob-ddmmyy' });
  attempts.push({ password: dob.substring(4), source: 'dob-year' }); // YYYY
  attempts.push({ password: dob.substring(0, 4), source: 'dob-ddmm' }); // DDMM
}
```

### 4. DOB + Card Combinations (Line 444-447)
```typescript
// Try DDMMYY + card combinations
if (dob.length === 8) {
  const ddmmyy = dob.substring(0, 4) + dob.substring(6, 8); // "15101985" → "151085"
  attempts.push({ password: ddmmyy + cardNum, source: `dob-ddmmyy+card-${index + 1}` });
}
```

## Test Results

### Before Fix:
```
DOB: 15101985
Card: 404400
Generated: 151019404400 ❌
Actual:    151085404400 ✅
Result: PDF_ENCRYPTED (failed to unlock)
```

### After Fix:
```
DOB: 15101985
Card: 404400
Generated: 151085404400 ✅
Actual:    151085404400 ✅
Result: Should unlock successfully! 🎉
```

## Impact

This bug affected **ALL banks** that use DDMMYY format:
- ✅ **HSBC** (DDMMYY + last 6 digits)
- ✅ **Any bank** using birth year variations
- ✅ **General fallback** password attempts

## Next Steps

1. ✅ Bug fixed in `src/lib/pdf-processor/llm-pdf-processor.ts`
2. ⏳ **Test with your HSBC statement again**
3. ⏳ Verify it unlocks successfully

## How to Test

1. Restart your dev server
2. Process the HSBC statement again with:
   - Name: (your name)
   - DOB: `15101985`
   - Card: `4400`
3. Expected password: `151085404400`
4. Should unlock successfully! 🎉


