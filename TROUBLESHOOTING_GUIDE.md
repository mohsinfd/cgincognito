# 🔍 Complete Troubleshooting Guide - First Principles

## The Problem

Dashboard shows **₹29.81 LAKH** instead of expected **₹2-3 LAKH**.

## Root Cause Analysis - 3 Possible Issues

### Issue 1: Data Stored Incorrectly
- **Where:** `src/app/gmail-test/page.tsx` (line 254-265)
- **What:** When saving to localStorage, credits are being counted
- **Test:** Run `scripts/debug-step1-check-raw-data.js`

### Issue 2: Data Displayed Incorrectly  
- **Where:** `src/components/monthly-spend-summary.tsx` (line 107-117)
- **What:** When showing dashboard, credits are being counted
- **Test:** Run `scripts/debug-step2-check-display-logic.js`

### Issue 3: Code Not Updated
- **Where:** Browser cache or Next.js build cache
- **What:** Old buggy code still running despite file changes
- **Test:** Run `scripts/debug-step3-check-code-versions.js`

---

## Systematic Debugging Process

### **STEP 1: Check Raw Data in localStorage**

**Run in browser console:**
```javascript
// Copy entire contents of scripts/debug-step1-check-raw-data.js
```

**Expected Output:**
```
✅ Stored totals are CORRECT (debits only)
Total STORED in localStorage: ₹2,500,000
Total ACTUAL debits: ₹2,500,000
Total credits (should be excluded): ₹500,000
```

**If you see ❌:**
- Problem is in `gmail-test/page.tsx` 
- Credits are being saved as debits
- Need to re-sync after fixing save logic

**If you see ✅:**
- Data in localStorage is correct
- Problem is in display logic or code not updated
- Continue to Step 2

---

### **STEP 2: Check Display Logic Simulation**

**Run in browser console:**
```javascript
// Copy entire contents of scripts/debug-step2-check-display-logic.js
```

**Expected Output:**
```
✅ Dashboard calculation is CORRECT!
Dashboard would show: ₹2,500,000
Stored in localStorage: ₹2,500,000
Actual debits only: ₹2,500,000
```

**If you see ❌:**
- Problem is in `monthly-spend-summary.tsx`
- Display logic is buggy
- Code changes not applied (see Step 3)

**If you see ✅:**
- Both save and display logic are correct
- But dashboard still shows wrong? 
- Definitely a caching issue (Step 3)

---

### **STEP 3: Force Complete Rebuild**

If Steps 1-2 show ✅ but dashboard still wrong, do this:

#### **A. Stop Server**
```bash
# In terminal where npm run dev is running
Ctrl+C
```

#### **B. Clear Build Cache**
```bash
cd "C:\Users\Mohsin\Downloads\Cursor 28 - CG Incognito"

# Windows PowerShell:
Remove-Item -Recurse -Force .next

# Or manually delete the .next folder
```

#### **C. Clear Browser Cache**
1. Open DevTools (F12)
2. Right-click on refresh button
3. Select "Empty Cache and Hard Reload"
4. Or: Settings > Clear browsing data > Cached images and files

#### **D. Restart Everything**
```bash
# Start server fresh
npm run dev

# Wait for "✓ Compiled successfully"
# Should take 10-20 seconds
```

#### **E. Verify Changes Applied**
1. Open browser DevTools > Sources
2. Search for `monthly-spend-summary.tsx`
3. Find line with `const isDebit`
4. Should see:
   ```javascript
   const typeStr = (txn.type || '').toString().toLowerCase();
   const isCredit = typeStr === 'cr' || typeStr === 'credit' ...
   ```
5. If you see old code without `typeStr` check, rebuild didn't work

---

## Quick Verification After Each Step

After fixing and rebuilding, run this quick check:

```javascript
// Quick verification script
const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
const total = statements.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
console.log(`Total in localStorage: ₹${total.toLocaleString()}`);

// Should be 2-3 lakh, not 29 lakh
if (total > 10000000) {
  console.error('❌ STILL WRONG - Total > 1 crore!');
} else if (total > 5000000) {
  console.warn('⚠️  Suspicious - Total > 5 lakh');
} else {
  console.log('✅ Looks correct - Total < 5 lakh');
}
```

---

## Nuclear Option - Start Fresh

If nothing works, completely reset:

### 1. Clear All Data
```javascript
// In browser console
localStorage.removeItem('cardgenius_statements');
console.log('✅ Cleared localStorage');
```

### 2. Rebuild Server
```bash
# Stop server
Ctrl+C

# Delete everything
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache

# Restart
npm run dev
```

### 3. Clear Browser Completely
```
1. Close all browser tabs for localhost:3000
2. Close browser completely
3. Reopen browser
4. Open localhost:3000 fresh
```

### 4. Re-sync
1. Go to /gmail-test
2. Click "Search Statements"
3. Fill in user details
4. Process statements
5. Check dashboard

---

## Expected Final State

### localStorage Data (Step 1)
- 19-20 statements
- Total stored: ₹2-3 lakh (NOT 29 lakh)
- Each statement's `totalAmount` should match its debit transactions only

### Dashboard Display (Step 2)
- Total Spend: ₹2-3 lakh
- HDFC: ~₹25 lakh (⚠️ seems high, needs investigation)
- IDFC: ~₹2.5 lakh
- HSBC: ~₹1 lakh
- AXIS: ~₹1.2 lakh

### Code Files (Step 3)
- `src/app/gmail-test/page.tsx` - lines 254-265 with new logic
- `src/components/monthly-spend-summary.tsx` - lines 107-117 with new logic
- Both should have `typeStr` and `isCredit` check

---

## Debugging Cheat Sheet

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| localStorage shows 29L | Save logic buggy | Fix gmail-test/page.tsx, re-sync |
| localStorage shows 3L, dashboard shows 29L | Display logic buggy OR caching | Fix monthly-spend-summary.tsx, rebuild |
| Both show 3L, but components show 29L | Browser cache | Hard reload, clear cache |
| Code looks correct in editor, wrong in browser | Next.js build cache | Delete .next folder, restart |
| Random different totals each time | React strict mode re-rendering | Check console for duplicate logs |

---

## Contact Info

If all else fails:
1. Share output of Step 1 script
2. Share output of Step 2 script
3. Share screenshot of DevTools > Sources showing the actual code running
4. Share terminal output showing "Compiled successfully" timestamp

This will pinpoint exactly where the issue is.

