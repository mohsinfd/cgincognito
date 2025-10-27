# How to Test SBI Parsing Fix

## Problem
SBI statements show 0 debit transactions after Gmail sync and LLM parsing.

## Diagnostic Steps

### Step 1: Run Diagnostic Script
Open browser console and paste:
```javascript
// Copy-paste contents of scripts/diagnose-sbi-zero-transactions.js
```

This will show:
- How many SBI statements exist
- What their content structure looks like
- Why no debit transactions were found

### Step 2: Check Possible Root Causes

#### Cause A: Password-Protected PDFs
**Check**: Look for password-related errors in terminal logs
**Fix**: SBI might need password format `DDMMYYYYLast4digits` (e.g., `151019854158`)

#### Cause B: BoostScore API Failure
**Check**: Look at BoostScore API response in terminal logs
**Fix**: BoostScore might not support SBI format or returned empty transactions

#### Cause C: LLM Extraction Failure
**Check**: See if parsedData exists but is empty
**Fix**: LLM might not understand SBI statement format

#### Cause D: Wrong Transaction Type Detection
**Check**: See if transactions exist but all marked as "Cr" instead of "Dr"
**Fix**: LLM prompt might be misclassifying SBI debits

### Step 3: Test One SBI Statement Manually

1. Find one SBI statement email in your Gmail
2. Download the PDF attachment
3. Go to `/upload` page
4. Upload with these details:
   - Bank: SBI
   - Name: [Your name]
   - DOB: [DDMMYYYY]
   - Card Last 4: [from statement]
   - Password: Try `DDMMYYYYLast4digits` format

5. Check if it parses correctly

### Step 4: Check BoostScore Response

If manual upload works but Gmail sync doesn't:
- BoostScore might be failing for Gmail-extracted PDFs
- Check terminal logs for BoostScore API errors
- Compare: Gmail PDF vs Manual Upload PDF

### Step 5: Review LLM Parsing

If BoostScore returns transactions but LLM outputs 0:
- Check LLM prompt instructions
- SBI might use different date/amount formats
- Check if SBI transactions have unusual structure

## Expected Results

### If Fix Works:
- SBI statements show debit transactions
- Dashboard displays SBI card spending
- Total spend includes SBI transactions

### If Still Broken:
Document what you see:
- How many SBI statements?
- Do they have content?
- What does processing_result show?
- Any errors in terminal?

## Current Status

SBI statements are being:
1. ✅ Detected in Gmail sync
2. ✅ Downloaded from email
3. ✅ Uploaded to BoostScore
4. ❓ Parsed by BoostScore (unknown)
5. ❓ Parsed by LLM (unknown)
6. ❌ Saved to localStorage (no debits)

Need to identify which step is failing.

