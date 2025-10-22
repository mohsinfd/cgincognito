# LLM Parser Quick Start Guide

Get up and running with the LLM statement parser in 5 minutes!

---

## ⚡ 5-Minute Setup

### 1. Install Dependencies (1 min)
```bash
npm install
```

This installs:
- `pdf-parse` - PDF text extraction
- `openai` - OpenAI GPT-4o integration
- `@anthropic-ai/sdk` - Anthropic Claude integration
- `@google/generative-ai` - Google Gemini integration
- `pdf-lib` - Password-protected PDF handling

### 2. Get API Key (2 min)

**Recommended: Google Gemini (Cheapest)**
1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

**Alternative: OpenAI (Better Accuracy)**
1. Go to: https://platform.openai.com/api-keys
2. Click "+ Create new secret key"
3. Copy the key (starts with `sk-`)

### 3. Configure Environment (30 sec)

Create `.env.local` in project root:

```bash
# Minimal configuration
LLM_PARSER_ENABLED=true
LLM_PARSER_PRIMARY_PROVIDER=gemini

# Add your API key
GOOGLE_AI_API_KEY=your-key-here
# OR
OPENAI_API_KEY=sk-your-key-here
```

### 4. Start Server (30 sec)
```bash
npm run dev
```

### 5. Test Upload (1 min)

**Option A: Using curl**
```bash
curl -X POST http://localhost:3000/api/parser-llm/upload \
  -F "file=@path/to/statement.pdf" \
  -F 'payload={"bank":"HDFC","name":"John Doe","dob":"15081990","card_no":"1234"}'
```

**Option B: Using Postman/Insomnia**
- Method: POST
- URL: `http://localhost:3000/api/parser-llm/upload`
- Body: form-data
  - `file`: (select PDF file)
  - `payload`: `{"bank":"HDFC","name":"John Doe","dob":"15081990","card_no":"1234"}`

---

## 📊 Example Response

```json
{
  "id": "llm_1704534589_a7b2c",
  "status": "COMPLETED",
  "content": {
    "card_details": {
      "bank": "HDFC",
      "num": "XXXX XXXX XXXX 1271",
      "card_type": "Regalia",
      "credit_limit": 500000
    },
    "transactions": [
      {
        "id": 1,
        "date": "15012024",
        "description": "SWIGGY BANGALORE",
        "amount": 450.00,
        "type": "Dr",
        "category": "online_food_ordering"
      }
      // ... more transactions
    ]
  },
  "_metadata": {
    "parser": "llm",
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "cost": 0.52,         // ₹0.52 (vs ₹10 with BoostScore!)
    "latency_ms": 4200,    // 4.2 seconds
    "confidence": 92       // 92% confidence
  }
}
```

---

## 🎯 What It Does

1. **Extracts text** from PDF (handles encrypted PDFs)
2. **Detects bank** automatically from header
3. **Parses transactions** using AI (GPT/Claude/Gemini)
4. **Maps to 20 categories** (amazon_spends, online_food_ordering, etc.)
5. **Validates output** (checks dates, amounts, structure)
6. **Returns BoostScore-compatible** JSON

---

## 💰 Cost Comparison

| Service | Cost/Statement | Your Cost (100 statements) |
|---------|---------------|---------------------------|
| BoostScore (current) | ₹10.00 | ₹1,000 |
| **Gemini Flash** | **₹0.50** | **₹50** (95% savings!) |
| OpenAI GPT-4o-mini | ₹1.50 | ₹150 (85% savings) |

---

## 🧪 Testing Different Providers

### Test with Gemini (Cheapest)
```bash
# .env.local
LLM_PARSER_PRIMARY_PROVIDER=gemini
GOOGLE_AI_API_KEY=your-key
```

### Test with OpenAI (Best Accuracy)
```bash
# .env.local
LLM_PARSER_PRIMARY_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
```

### Test with Anthropic (Balanced)
```bash
# .env.local
LLM_PARSER_PRIMARY_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key
```

---

## 🔬 A/B Test vs BoostScore

```bash
curl -X POST http://localhost:3000/api/parser-llm/compare \
  -F "file=@statement.pdf" \
  -F 'payload={"bank":"HDFC","name":"Test","dob":"01011990","card_no":"1234"}'
```

This endpoint:
- Parses with **both** LLM and BoostScore
- Shows side-by-side comparison
- Calculates accuracy and cost savings

---

## 🎨 Supported Banks

Works with all major Indian banks:
- ✅ HDFC Bank
- ✅ Axis Bank
- ✅ SBI Cards
- ✅ ICICI Bank
- ✅ Kotak Mahindra
- ✅ American Express
- ✅ Citibank
- ✅ Standard Chartered
- ✅ HSBC
- ✅ IndusInd Bank
- ✅ Yes Bank
- ✅ RBL Bank

---

## ⚡ Common Use Cases

### 1. Manual Upload (Like BoostScore)
```typescript
POST /api/parser-llm/upload
```
- User uploads PDF from browser
- Parse immediately
- Return results

### 2. Batch Processing
```typescript
const parser = createLLMParser();

for (const pdf of pdfs) {
  const result = await parser.parseStatement(pdf);
  await saveToDatabase(result);
}
```

### 3. Gmail Auto-Sync
```typescript
// When new statement email arrives
const pdf = await downloadAttachment(email);
const result = await parser.parseStatement(pdf, {
  bank: detectBankFromSender(email.from)
});
```

---

## 🐛 Troubleshooting

### "API key not configured"
- Check `.env.local` has the correct key
- Restart dev server: `npm run dev`

### "PDF appears to be scanned"
- Scanned PDFs not supported yet (OCR coming soon)
- Try a different statement

### High cost
- Switch to Gemini: `LLM_PARSER_PRIMARY_PROVIDER=gemini`
- Set limit: `LLM_PARSER_MAX_COST_PER_STATEMENT=2`

### Low accuracy
- Switch to GPT-4o: Use `gpt-4o` model
- Check `_metadata.confidence` score
- Add bank-specific examples in prompts

---

## 📚 Next Steps

1. ✅ **Test with your statements** - Try 5-10 real PDFs
2. ✅ **Compare with BoostScore** - Use `/compare` endpoint
3. ✅ **Monitor costs** - Check `_metadata.cost` in responses
4. ✅ **Tune prompts** - Edit `src/lib/parser-llm/prompts/` if needed
5. ✅ **Enable in production** - Set `LLM_PARSER_ENABLED=true`

---

## 📞 Need Help?

- 📖 **Full docs**: `src/lib/parser-llm/README.md`
- 🔧 **Environment setup**: `LLM_PARSER_ENV_SETUP.md`
- 📋 **Implementation details**: `LLM_PARSER_IMPLEMENTATION.md`
- 🎯 **Plan document**: `llm-pdf-parser-alternative.plan.md`

---

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] API key obtained (Gemini/OpenAI/Anthropic)
- [ ] `.env.local` configured with key
- [ ] `LLM_PARSER_ENABLED=true`
- [ ] Dev server running (`npm run dev`)
- [ ] Test upload successful
- [ ] Response includes `_metadata.cost` and `_metadata.confidence`

**Once all checked, you're ready to use the LLM parser!** 🎉

---

**Estimated setup time: 5 minutes**  
**Cost savings: 85-95%**  
**Maintenance: Zero (LLMs adapt automatically)**

🚀 **Start parsing smarter, not harder!**




