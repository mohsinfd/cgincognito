# Quick Setup Instructions for Testing

## 🚀 Get Started in 3 Steps

### Step 1: Configure OpenAI (2 minutes)

1. **Create `.env.local`** file in project root
2. **Add your OpenAI key**:

```bash
OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE
LLM_PARSER_ENABLED=true
LLM_PARSER_PRIMARY_PROVIDER=openai
WEB_ORIGIN=http://localhost:3000
```

3. **Save the file**

---

### Step 2: Install & Run (2 minutes)

```bash
# Install dependencies
npm install

# Start server
npm run dev
```

Server will start at: http://localhost:3000

---

### Step 3: Test LLM Parser (1 minute)

**Upload a statement via API**:

```bash
curl -X POST http://localhost:3000/api/parser-llm/upload \
  -F "file=@path/to/your/statement.pdf" \
  -F 'payload={"bank":"HDFC","name":"Your Name","dob":"01011990","card_no":"1234"}'
```

**Or use Postman/Insomnia**:
- URL: `POST http://localhost:3000/api/parser-llm/upload`
- Body: form-data
  - `file`: Select PDF
  - `payload`: `{"bank":"HDFC","name":"Test","dob":"01011990","card_no":"1234"}`

---

## 📱 Current User Workflows

### Workflow 1: Manual Upload (Works Now)

```
User → Upload Page → Select PDF → Parse → View Results
```

**What happens:**
1. User goes to `/upload` page
2. Selects PDF statement from computer
3. Frontend sends to `/api/parser-llm/upload`
4. Backend:
   - Extracts text from PDF
   - Calls OpenAI GPT-4o-mini
   - Parses transactions
   - Maps to 20 categories
   - Returns results
5. User sees:
   - Transaction list
   - Spending by category
   - Optimizer recommendations

**Cost**: ~₹1.50 per statement

---

### Workflow 2: Gmail Auto-Sync (Needs Setup)

```
User → Connect Gmail → OAuth → Auto-Sync → Dashboard
```

**What happens:**
1. User clicks "Connect Gmail"
2. OAuth consent screen (grant permissions)
3. Background job runs every 15 min:
   - Searches Gmail for statement emails
   - Downloads PDF attachments
   - Auto-parses with LLM
   - Stores in database
4. User sees all statements in dashboard

**Cost**: ~₹1.50 per statement (auto-parsed)

**Setup needed**: See [GMAIL_INTEGRATION_SETUP.md](GMAIL_INTEGRATION_SETUP.md)

---

## 📊 What You Can Test Right Now

### 1. LLM Parser (Ready ✅)

Upload a statement and get:
- ✅ Extracted transactions
- ✅ 20-category mapping
- ✅ Card details (masked)
- ✅ Spending summary
- ✅ Cost & confidence metadata

### 2. Compare LLM vs BoostScore (Ready ✅)

If you have BoostScore API keys:

```bash
curl -X POST http://localhost:3000/api/parser-llm/compare \
  -F "file=@statement.pdf" \
  -F 'payload={"bank":"HDFC","name":"Test","dob":"01011990","card_no":"1234"}'
```

Shows:
- Side-by-side comparison
- Accuracy metrics
- Cost savings

### 3. Gmail Integration (Needs OAuth Setup)

Follow [GMAIL_INTEGRATION_SETUP.md](GMAIL_INTEGRATION_SETUP.md) to:
- Set up Google OAuth
- Connect your Gmail
- Auto-sync statements

---

## 🎯 Recommended Testing Order

### Phase 1: Test LLM Parser (Today)
1. ✅ Add OpenAI key to `.env.local`
2. ✅ Run `npm install && npm run dev`
3. ✅ Upload 1-2 test statements
4. ✅ Verify accuracy & cost
5. ✅ Check response metadata

### Phase 2: Build UI (This Week)
1. Create upload page UI
2. Add results display
3. Add spending charts
4. Test user flow

### Phase 3: Gmail Integration (Next Week)
1. Set up Google OAuth (5 min)
2. Connect your Gmail account
3. Test statement search
4. Test auto-parsing
5. Set up background sync

---

## 💰 Expected Costs

### Manual Upload
- Per statement: ₹1.50 (GPT-4o-mini)
- 10 statements: ₹15
- 100 statements: ₹150

### Gmail Auto-Sync
- Same cost: ₹1.50 per statement
- But automatic (no manual work!)

**vs BoostScore**: ₹10 per statement (85% savings!)

---

## 📁 Key Files

### LLM Parser
- Main: `src/lib/parser-llm/index.ts`
- Upload API: `src/app/api/parser-llm/upload/route.ts`
- Compare API: `src/app/api/parser-llm/compare/route.ts`

### Gmail Integration
- OAuth: `src/lib/gmail/oauth.ts`
- Client: `src/lib/gmail/client.ts`
- Connect API: `src/app/api/gmail/connect/route.ts`
- Callback API: `src/app/api/oauth2/callback/route.ts`

### Documentation
- Quick Start: `LLM_PARSER_QUICK_START.md`
- Gmail Setup: `GMAIL_INTEGRATION_SETUP.md`
- Full Docs: `src/lib/parser-llm/README.md`

---

## ❓ FAQ

**Q: Do I need BoostScore API keys?**
A: No! The LLM parser works standalone. BoostScore is optional fallback.

**Q: Which LLM provider should I use?**
A: OpenAI GPT-4o-mini is best balance (₹1.50, 90% accuracy). Gemini is cheaper (₹0.50) but slightly less accurate.

**Q: How do I test Gmail integration?**
A: Follow [GMAIL_INTEGRATION_SETUP.md](GMAIL_INTEGRATION_SETUP.md) to set up Google OAuth first.

**Q: Can I use my own Gmail for testing?**
A: Yes! Just add yourself as a "Test User" in Google OAuth consent screen.

**Q: What if parsing fails?**
A: Check `_metadata.confidence` score. If low (<80%), statement might be scanned or unusual format.

---

## 🚀 Next Steps

1. **Add OpenAI key** to `.env.local`
2. **Test upload** a statement
3. **Review results** and metadata
4. **Set up Gmail** (optional) for auto-sync

---

**Need help?** Check the documentation files or the API endpoints!




