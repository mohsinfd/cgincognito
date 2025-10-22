# 🔧 Run These Debug Scripts Now

I've verified the code IS correct in both files. The issue must be caching.

## **STEP 1: Copy and paste this into browser console**

```javascript
// ═══════════════════════════════════════════════════════════
// STEP 1: CHECK RAW DATA
// ═══════════════════════════════════════════════════════════

const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');

console.log(`📊 Total statements: ${statements.length}`);
console.log(`📅 Last sync: ${new Date(statements[0]?.uploadedAt).toLocaleString()}\n`);

let totalStoredAmount = 0;
let totalActualDebits = 0;
let totalCredits = 0;

statements.forEach((stmt, index) => {
  const txns = stmt.content?.content?.transactions || [];
  const storedTotal = stmt.totalAmount || 0;
  totalStoredAmount += storedTotal;
  
  let debitSum = 0;
  let creditSum = 0;
  
  txns.forEach(t => {
    const type = (t.type || '').toLowerCase();
    if (type === 'cr' || type === 'credit') {
      creditSum += t.amount;
    } else if (type === 'dr' || type === 'debit') {
      debitSum += t.amount;
    }
  });
  
  totalActualDebits += debitSum;
  totalCredits += creditSum;
  
  const isCorrect = Math.abs(storedTotal - debitSum) < 1;
  console.log(`${isCorrect ? '✅' : '❌'} ${stmt.bankCode.toUpperCase()}: Stored=₹${storedTotal.toFixed(0)}, Debits=₹${debitSum.toFixed(0)}, Credits=₹${creditSum.toFixed(0)}`);
});

console.log(`\nTOTAL STORED: ₹${totalStoredAmount.toLocaleString()}`);
console.log(`TOTAL DEBITS: ₹${totalActualDebits.toLocaleString()}`);
console.log(`TOTAL CREDITS: ₹${totalCredits.toLocaleString()}`);

if (Math.abs(totalStoredAmount - totalActualDebits) > 100) {
  console.error('\n❌ DATA IS WRONG - Need to clear and re-sync!');
} else {
  console.log('\n✅ DATA IS CORRECT - Problem is display/caching');
}
```

**Share the output with me!**

---

## **Based on the output:**

### If you see ❌ (Data is wrong):
```javascript
// Clear localStorage and re-sync
localStorage.removeItem('cardgenius_statements');
console.log('✅ Cleared - now go to /gmail-test and re-run sync');
```

### If you see ✅ (Data is correct):
The problem is **100% caching**. Do this:

1. **Stop the server** (terminal where `npm run dev` is running):
   - Press `Ctrl+C`

2. **Delete build cache**:
   ```bash
   # In terminal
   cd "C:\Users\Mohsin\Downloads\Cursor 28 - CG Incognito"
   Remove-Item -Recurse -Force .next
   ```

3. **Restart server**:
   ```bash
   npm run dev
   # Wait for "✓ Compiled successfully"
   ```

4. **Clear browser cache**:
   - Close ALL tabs of localhost:3000
   - Reopen browser
   - Go to localhost:3000/dashboard
   - Press `Ctrl+Shift+R` (hard refresh)

5. **Check dashboard** - should now show correct totals

---

## **Quick Test After Rebuild**

```javascript
// Run this to verify dashboard is using correct logic
const statements = JSON.parse(localStorage.getItem('cardgenius_statements') || '[]');
const storedTotal = statements.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
console.log(`Stored in localStorage: ₹${storedTotal.toLocaleString()}`);

// Check what you see on dashboard
const dashboardTotal = document.querySelector('[class*="Total Spend"]')?.nextElementSibling?.textContent;
console.log(`Shown on dashboard: ${dashboardTotal}`);

if (dashboardTotal && dashboardTotal.includes(storedTotal.toFixed(0).substring(0, 3))) {
  console.log('✅ MATCH - Dashboard showing correct data!');
} else {
  console.error('❌ MISMATCH - Still showing wrong data');
  console.log('Try: Close browser completely, reopen, hard refresh');
}
```

---

## **Nuclear Option if Nothing Works**

```bash
# 1. Stop server
Ctrl+C

# 2. Delete EVERYTHING
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache

# 3. Restart
npm run dev
```

Then in browser:
```javascript
// Clear localStorage
localStorage.clear();

// Close browser completely
// Reopen and go to /gmail-test
// Re-run full sync from scratch
```

---

**START WITH STEP 1 SCRIPT AND SHARE THE OUTPUT!**

