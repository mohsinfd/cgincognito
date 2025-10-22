# LLM Parser Environment Setup

Add these variables to your `.env.local` file:

```bash
# =============================================================================
# LLM Parser Configuration (NEW)
# =============================================================================

# Enable LLM Parser (Feature Flag)
LLM_PARSER_ENABLED=true

# Primary Provider (gemini | openai | anthropic)
# gemini = cheapest (₹0.50/statement)
# openai = balanced (₹1.50/statement with gpt-4o-mini)
# anthropic = high accuracy (₹3.50/statement with sonnet)
LLM_PARSER_PRIMARY_PROVIDER=gemini

# Fallback to BoostScore if LLM parsing fails
LLM_PARSER_FALLBACK_TO_BOOSTSCORE=true

# =============================================================================
# LLM Provider API Keys
# =============================================================================

# OpenAI API Key
# Get from: https://platform.openai.com/api-keys
# Cost: $0.15 per 1M input tokens (gpt-4o-mini)
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic API Key  
# Get from: https://console.anthropic.com/
# Cost: $0.25 per 1M input tokens (claude-3-haiku)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Google AI API Key
# Get from: https://makersuite.google.com/app/apikey
# Cost: $0.04 per 1M input tokens (gemini-1.5-flash) - CHEAPEST!
GOOGLE_AI_API_KEY=your-google-ai-key-here

# =============================================================================
# Cost Limits (in ₹ Rupees)
# =============================================================================

# Maximum cost per single statement parse
LLM_PARSER_MAX_COST_PER_STATEMENT=5

# Monthly budget for LLM parsing
LLM_PARSER_MONTHLY_BUDGET=10000

# =============================================================================
# Caching (Optional)
# =============================================================================

# Cache parsed results (in seconds)
# Default: 30 days
LLM_PARSER_CACHE_TTL=2592000
```

## Quick Setup Guide

### Step 1: Get API Keys

#### Option A: Google Gemini (Recommended - Cheapest!)
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Add to `.env.local`:
   ```bash
   GOOGLE_AI_API_KEY=your-key-here
   LLM_PARSER_PRIMARY_PROVIDER=gemini
   ```

#### Option B: OpenAI (Balanced)
1. Go to https://platform.openai.com/api-keys
2. Click "+ Create new secret key"
3. Copy the key (starts with `sk-`)
4. Add to `.env.local`:
   ```bash
   OPENAI_API_KEY=sk-your-key-here
   LLM_PARSER_PRIMARY_PROVIDER=openai
   ```

#### Option C: Anthropic (High Accuracy)
1. Go to https://console.anthropic.com/
2. Settings → API Keys → Create Key
3. Copy the key (starts with `sk-ant-`)
4. Add to `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   LLM_PARSER_PRIMARY_PROVIDER=anthropic
   ```

### Step 2: Enable the Parser
```bash
LLM_PARSER_ENABLED=true
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Test
```bash
npm run dev

# Then upload a statement via:
curl -X POST http://localhost:3000/api/parser-llm/upload \
  -F "file=@statement.pdf" \
  -F 'payload={"bank":"HDFC","name":"Test User","dob":"01011990","card_no":"1234"}'
```

## Cost Comparison

| Provider | Key Required | Cost/Statement | Accuracy | Speed |
|----------|-------------|----------------|----------|-------|
| **Gemini Flash** | GOOGLE_AI_API_KEY | ₹0.50 | 82% | 3-5s |
| **GPT-4o-mini** | OPENAI_API_KEY | ₹1.50 | 90% | 5-8s |
| **Claude Haiku** | ANTHROPIC_API_KEY | ₹1.00 | 88% | 4-6s |
| BoostScore (current) | BOOST_API_KEY | ₹10.00 | 85% | 15-30s |

## Recommended Setup

For **development/testing**:
```bash
LLM_PARSER_ENABLED=true
LLM_PARSER_PRIMARY_PROVIDER=gemini
GOOGLE_AI_API_KEY=your-key
```

For **production** (best quality):
```bash
LLM_PARSER_ENABLED=true
LLM_PARSER_PRIMARY_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=your-key
LLM_PARSER_FALLBACK_TO_BOOSTSCORE=true  # Safety net
```

## Troubleshooting

### Error: "API key not configured"
- Make sure the API key is in `.env.local`
- Restart the dev server after adding keys

### Error: "Provider unavailable"
- Check your API key is valid
- Check your account has credits
- Try a different provider

### High Costs
- Reduce `LLM_PARSER_MAX_COST_PER_STATEMENT`
- Switch to Gemini (cheaper)
- Enable caching to avoid re-parsing

### Low Accuracy
- Switch to GPT-4o or Claude Sonnet
- Check `_metadata.confidence` score
- Use `/api/parser-llm/compare` to test

## Monitoring Costs

Check the response metadata:
```json
{
  "_metadata": {
    "parser": "llm",
    "provider": "gemini",
    "cost": 0.52,  // ← Cost in ₹
    "latency_ms": 4200,
    "confidence": 92
  }
}
```

Track your monthly spend:
```bash
# Log all costs and sum them up
# Add monitoring dashboard to track budget
```

## Security Notes

- ⚠️ **Never commit API keys to git**
- ✅ Use `.env.local` (gitignored by default)
- ✅ Use different keys for dev vs production
- ✅ Set cost limits to prevent overuse
- ✅ Rotate keys periodically




