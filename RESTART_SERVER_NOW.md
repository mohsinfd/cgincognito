# 🚨 CRITICAL: Server Must Be Fully Restarted 🚨

## The Problem
The error shows line 56 throwing `PDF_ENCRYPTED`, which is from the **OLD code**.  
The server is **still running cached compiled code** from before our fixes.

## What's Happening
```
Current running code (WRONG):
❌ Line 56: throw new Error('PDF_ENCRYPTED');

Code on disk (CORRECT):
✅ Line 56: // Other errors, continue with original buffer
```

## How to Fix: STOP and RESTART

### Step 1: STOP the Current Server

Find your terminal/PowerShell window where you see:
```
✓ Ready on http://localhost:3000
```

**Press `Ctrl+C`** and wait for it to fully stop.

You should see the command prompt return (`$` or `C:\...>`).

### Step 2: Kill Any Stuck Node Processes

Run this in PowerShell or Command Prompt:

```cmd
taskkill /F /IM node.exe
```

This ensures no old Node.js processes are lingering.

### Step 3: Restart on Port 3000

**Option A: Use Command Prompt (RECOMMENDED)**

Open Command Prompt (not PowerShell) and run:
```cmd
cd "c:\Users\Mohsin\Downloads\Cursor 28 - CG Incognito"
set PORT=3000
npm run dev
```

**Option B: Use the Batch File**

Double-click: `restart-server.cmd`

### Step 4: Verify It's Running

You should see:
```
✓ Ready on http://localhost:3000
✓ Compiled in X ms
```

### Step 5: Hard Refresh Browser

Go to `http://localhost:3000/gmail-test`  
Press `Ctrl+Shift+R` (hard refresh to clear cache)

---

## How to Confirm It's Working

### Test 1: Check Password Hint Extraction

Click "Test Sync" and look for in console:
```
✅ GOOD (working):
🔍 Analyzing password hint for hdfc
📧 Email body length: 1234 characters
✅ Password analysis for hdfc: ...

❌ BAD (still broken):
⚠️ No email body found for hdfc
```

### Test 2: Check PDF Decryption

After processing, look for:
```
✅ GOOD (working):
🔓 Successfully decrypted PDF with password: "15101985"

❌ BAD (still broken):
❌ Parse error: Error: PDF_ENCRYPTED
    at extractTextFromPDF (... :56:19)  ← This line number means OLD CODE
```

---

## Why Restart Is Critical

Next.js caches compiled TypeScript in:
- `.next/cache/`
- Memory (server process)

Even though we edited:
- ✅ `src/lib/gmail/client.ts` (saved)
- ✅ `src/lib/parser-llm/core/pdf-extractor.ts` (saved)

The server is executing:
- ❌ Old compiled code from `.next/cache/`
- ❌ Old code loaded in the Node process

**Full restart forces:**
1. Delete compiled cache
2. Re-read source files
3. Re-compile TypeScript
4. Load fresh code into memory

---

## Common Mistakes

### ❌ WRONG: Just saving files
Files are saved, but server doesn't reload

### ❌ WRONG: Hot reload / Fast refresh
Next.js hot reload doesn't always pick up deep module changes

### ❌ WRONG: Running in PowerShell with `&&`
PowerShell doesn't support `&&` operator

### ✅ CORRECT: Full stop + restart
1. Ctrl+C to stop
2. Wait for exit
3. Run `npm run dev` again
4. Wait for "Ready"
5. Hard refresh browser

---

## Checklist

- [ ] Server completely stopped (Ctrl+C or taskkill)
- [ ] No "Ready on..." message visible
- [ ] Restarted with `set PORT=3000` + `npm run dev`
- [ ] Saw "✓ Ready on http://localhost:3000"
- [ ] Browser hard-refreshed (Ctrl+Shift+R)
- [ ] Tested "Test Sync" button
- [ ] Console shows email body extraction
- [ ] No errors at line 56 anymore

---

## If Still Not Working

### Delete Next.js Cache Manually

```cmd
cd "c:\Users\Mohsin\Downloads\Cursor 28 - CG Incognito"
rmdir /s /q .next
npm run dev
```

This will:
1. Delete all compiled code
2. Force complete rebuild
3. Guarantee fresh code is loaded

---

## Current Status

### Files Fixed (on disk):
✅ `src/lib/gmail/client.ts` - emailBody now included  
✅ `src/lib/parser-llm/core/pdf-extractor.ts` - pdf-lib decryption added

### Server Status:
❌ Running old code (must restart!)

### What You'll See After Restart:
- Email body extraction working
- Password hint analysis showing results
- PDF decryption using pdf-lib
- Better error messages
- Actual password attempts logged


