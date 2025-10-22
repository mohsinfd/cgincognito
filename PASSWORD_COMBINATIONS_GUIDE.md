# Password Combination Strategy for PDF Statements

## Overview
Our system attempts to unlock password-protected credit card statements using smart password combinations based on user details.

## User Input Fields

1. **Name** (Optional) - "JOHN DOE"
2. **Date of Birth** (Optional) - "15011990" (DDMMYYYY)
3. **Card Numbers** (Optional) - ["1234", "56"] (Last 2-4 digits)

---

## Password Attempt Categories

### 1. Common Defaults (6 attempts)
Banks sometimes use default passwords. We try:
- `0000`
- `1234`
- `password`
- `123456`
- `1111`
- `2222`

---

### 2. Name-Based Passwords (if name provided)

**Example: Name = "JOHN DOE"**

| Password | Source |
|----------|--------|
| `JOHN DOE` | name-full |
| `JOHNDOE` | name-no-spaces |
| `JOHN` | name-first |
| `DOE` | name-last |
| `JD` | name-initials |

**Total:** ~5 variations

---

### 3. Date of Birth Passwords (if DOB provided)

**Example: DOB = "15011990"**

| Password | Source |
|----------|--------|
| `15011990` | dob-full (DDMMYYYY) |
| `150190` | dob-yy (DDMMYY) |
| `1990` | dob-year (YYYY) |
| `1501` | dob-ddmmyy (DDMM) |
| `09911051` | dob-reverse |

**For DDMMYY format (e.g., "150190"):**
- `150190` (dob-yy)
- `1501` (dob-ddmmyy)
- `90` (dob-year - last 2 digits)

**Total:** ~5 variations

---

### 4. Card Number Passwords (if card numbers provided)

**Example: Card Numbers = ["1234", "56"]**

**For "1234" (4 digits):**
- `1234` (card-1)
- `123400` (card-1-padded-6)
- `001234` (card-1-prefixed-6)

**For "56" (2 digits):**
- `56` (card-2)
- `5600` (card-2-padded)
- `0056` (card-2-prefixed)

**Total:** ~3 variations per card number

---

### 5. Combination Passwords

#### Name + DOB Combinations (if both provided)
**Example: "JOHN DOE" + "15011990"**

| Password | Source |
|----------|--------|
| `JOHN DOE15011990` | name+dob |
| `15011990JOHN DOE` | dob+name |
| `JOHN15011990` | firstname+dob |
| `15011990JOHN` | dob+firstname |
| `DOE15011990` | lastname+dob |
| `15011990DOE` | dob+lastname |

**Total:** ~6 variations

---

#### Name + Card Combinations (if both provided)
**Example: "JOHN DOE" + "1234"**

| Password | Source |
|----------|--------|
| `JOHN DOE1234` | name+card-1 |
| `1234JOHN DOE` | card-1+name |
| `JOHN1234` | firstname+card-1 |
| `1234JOHN` | card-1+firstname |

**Repeated for each card number.**

**Total:** ~4 variations per card number

---

#### DOB + Card Combinations (if both provided)
**Example: "15011990" + "1234"**

| Password | Source |
|----------|--------|
| `150119901234` | dob+card-1 |
| `123415011990` | card-1+dob |
| `1501901234` | dob-yy+card-1 |
| `15011234` | dob-ddmmyy+card-1 |

**Repeated for each card number.**

**Total:** ~4 variations per card number

---

## Maximum Password Attempts

### Scenario 1: All fields provided
- Name: "JOHN DOE"
- DOB: "15011990"
- Cards: ["1234", "56"]

**Total Attempts:** ~60-70 passwords

### Scenario 2: Only DOB + 1 Card
- DOB: "15011990"
- Cards: ["1234"]

**Total Attempts:** ~20-25 passwords

### Scenario 3: All defaults + DOB only
- DOB: "15011990"

**Total Attempts:** ~15 passwords

---

## Common Bank Password Patterns

Based on industry patterns, banks typically use:

1. **HDFC, ICICI, Axis** → DOB (DDMMYYYY or DDMMYY)
2. **SBI, Kotak** → Last 4 digits of card
3. **HSBC, Standard Chartered** → Name + DOB combinations
4. **Yes Bank, RBL** → DOB or Card number
5. **IDFC, IndusInd** → Mixed (DOB/Card/Name)

---

## Password Attempt Logging

Each attempt is logged with:
```
🔐 Trying password: "15011990" (dob-full)
🔐 Trying password: "JOHN1234" (firstname+card-1)
✅ Success! Password found: "1501" (dob-ddmmyy)
```

---

## What We Need from Users

### Minimum (for basic attempts):
- DOB (DDMMYYYY or DDMMYY)
- OR Last 4 digits of card

### Recommended (for best results):
- ✅ Name (as on card)
- ✅ DOB (DDMMYYYY)
- ✅ Last 4 digits of ALL cards

### Example:
```
Name: JOHN DOE
DOB: 15011990
Cards: 1234, 5678
```

This gives us **60-70 password attempts** covering most bank patterns!

---

## How BoostScore Differs

BoostScore API:
- ✅ Requires: Name, DOB, Bank, Card number
- ✅ Has internal password logic per bank
- ❌ Costs money per API call
- ❌ Limited to their supported banks

Our LLM Parser:
- ✅ Free (just OpenAI API costs for parsing)
- ✅ Flexible password strategy
- ✅ Works with any bank
- ✅ More transparent (you see all attempts)
- ⚠️ Requires good user input for best results

---

## Testing Your Passwords

1. Go to http://localhost:3000/gmail-test
2. Connect Gmail
3. Find your statements
4. Click "Process Statements"
5. Enter your details:
   - **Name:** JOHN DOE
   - **DOB:** 15011990
   - **Cards:** 1234, 5678
6. Watch the console for password attempts!

The logs will show you:
- Which passwords were tried
- Which one worked (if any)
- How many attempts were made


