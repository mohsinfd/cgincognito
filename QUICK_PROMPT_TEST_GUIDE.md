# Quick Prompt Testing Guide

## 🎯 Goal
Test the LLM prompt on a single statement without running full Gmail sync.

## 📋 Prerequisites

1. **Have a test PDF statement** (e.g., from your Downloads folder)
2. **Know the password** for the PDF
3. **Know the bank code** (hdfc, axis, sbi, etc.)
4. **OpenAI API key** set in environment

## 🚀 Quick Start

### Step 1: Set API Key
```powershell
# PowerShell (Windows)
$env:OPENAI_API_KEY="your-openai-key-here"
```

### Step 2: Run Test Script
```powershell
# Basic usage (from project root)
node scripts/test-prompt-single-statement.js <pdf-path> <password> <bank-code>

# Example 1: HDFC statement
node scripts/test-prompt-single-statement.js "C:\Users\Mohsin\Downloads\hdfc-statement.pdf" MOHS1510 hdfc

# Example 2: HSBC statement
node scripts/test-prompt-single-statement.js ".\20251008.pdf" 151085404400 hsbc

# Example 3: SBI statement
node scripts/test-prompt-single-statement.js ".\sbi-sept.pdf" 151019854158 sbi
```

## 📊 What You'll See

The script will show:

1. **Decryption status** - Whether PDF unlocked successfully
2. **Text extraction** - How much text was extracted
3. **Parsing time** - How long OpenAI took
4. **Transaction summary**:
   - Total transactions found
   - Debits vs Credits count
   - Total spending (Dr only)
   - Category breakdown with percentages
5. **Sample transactions** - First few from each type
6. **Full JSON output** - Saved to file for inspection

## ✅ What to Check

### 1. Dr vs Cr Accuracy
```
✅ Good: Debits = purchases, Credits = payments
❌ Bad: Payments counted as debits
```

### 2. Total Spending
```
✅ Good: Total matches your expectation
❌ Bad: Total is 2x what you expect (credits being counted)
```

### 3. Category Distribution
```
✅ Good: Reasonable distribution (no single category >50%)
❌ Bad: "other_offline_spends" at 80%
```

### 4. Merchant Names
```
✅ Good: "SWIGGY BANGALORE", "AMAZON INDIA"
❌ Bad: "POS*SWIGGY123456TXN", "ECOM*AMAZON890REF"
```

### 5. Dates
```
✅ Good: "2025-09-15" (YYYY-MM-DD)
❌ Bad: "15/09/2025", "Sep 15 2025"
```

## 🔍 Example Output

```
🧪 Testing LLM Prompt on Single Statement
================================================================================
📄 PDF: hdfc-statement.pdf
🔐 Password: MOHS1510
🏦 Bank: hdfc
================================================================================

🔓 Step 1: Decrypting PDF...
✅ PDF decrypted successfully

📖 Step 2: Extracting text...
✅ Text extracted successfully
📊 Length: 6938 characters
📄 Pages: 2

🤖 Step 3: Parsing with OpenAI...
⏳ This may take 10-30 seconds...

✅ OpenAI parsing complete (15.2s)

📊 Step 4: Analyzing Results...
================================================================================

🎯 SUMMARY:
   Total Transactions: 11
   Debits (Dr): 10
   Credits (Cr): 1

💰 TOTALS:
   Total Spending (Dr): ₹25,437.80
   Total Credits (Cr): ₹10,000.00
   Net: ₹15,437.80

📂 CATEGORY BREAKDOWN (Debits only):
   other_offline_spends           ₹12,345.00 (48.5%)
   online_food_ordering            ₹5,678.90 (22.3%)
   dining_or_going_out             ₹3,456.00 (13.6%)
   grocery_spends_online           ₹2,345.60 (9.2%)
   fuel                            ₹1,612.30 (6.3%)

📝 SAMPLE TRANSACTIONS:
--------------------------------------------------------------------------------
First 5 Debits:

1. SWIGGY BANGALORE
   Date: 2025-09-05 | Amount: ₹456.00 | Category: online_food_ordering

2. SHELL PETROL PUMP
   Date: 2025-09-07 | Amount: ₹1,612.30 | Category: fuel

3. AMAZON INDIA
   Date: 2025-09-10 | Amount: ₹2,345.00 | Category: other_offline_spends

...

================================================================================
✅ Full output saved to: temp-decrypted/parsed-output-1760689123456.json

🎉 Test complete!
```

## 🎯 Quick Validation Checklist

After running the test, verify:

- [ ] Total spending is reasonable (not inflated by credits)
- [ ] Dr/Cr split makes sense (mostly debits, few credits)
- [ ] Categories are distributed reasonably
- [ ] Merchant names are clean (no POS*, ECOM* prefixes)
- [ ] Dates are in YYYY-MM-DD format
- [ ] All amounts are positive numbers
- [ ] No parsing errors or JSON syntax issues

## 🐛 Troubleshooting

### Error: "OPENAI_API_KEY not set"
```powershell
$env:OPENAI_API_KEY="your-key-here"
```

### Error: "qpdf: invalid password"
```
Check your password or try these common patterns:
- HDFC: MOHS1510 (name4+ddmm)
- HSBC: 151085404400 (ddmmyy+last6)
- SBI: 151019854158 (ddmmyyyylast4)
```

### Error: "File not found"
```powershell
# Use absolute path
node scripts/test-prompt-single-statement.js "C:\Users\...\statement.pdf" PASSWORD BANK

# Or relative from project root
node scripts/test-prompt-single-statement.js .\statement.pdf PASSWORD BANK
```

### Very High "other_offline_spends"
```
This means merchants aren't matching categorization rules.
Check the full JSON output to see which merchants are unclear.
```

## 📁 Output Files

All test files saved to `temp-decrypted/`:
- `parsed-output-*.json` - Full LLM response
- Temporary decrypted PDFs (auto-cleaned)

## 🔄 Iterating on Prompt

1. Run test with current prompt
2. Check results (categories, merchant names, Dr/Cr)
3. Modify prompt in `scripts/test-prompt-single-statement.js`
4. Re-run test
5. Compare results

## 💡 Pro Tips

1. **Test with multiple banks** - Each bank formats statements differently
2. **Check edge cases** - Large transactions, refunds, foreign currency
3. **Validate totals** - Compare with PDF summary section
4. **Inspect full JSON** - Check for patterns in miscategorizations
5. **Compare old vs new** - Run with old and new prompts, compare results

## 🎓 What Makes a Good Result

| Metric | Good | Bad |
|--------|------|-----|
| Dr/Cr accuracy | 100% | <95% |
| Category distribution | No single >50% | One category >70% |
| Merchant names | Clean | Full of codes |
| Total spending | Matches PDF | 2x PDF total |
| Parsing time | <20s | >60s |
| other_offline_spends | <20% | >50% |

