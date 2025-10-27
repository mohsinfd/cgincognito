# Minimal Railway Environment Variables (Production)

Based on your current codebase, here are the **essential** variables you need:

## Critical (Must Have for Basic Functionality)

```bash
# Google OAuth (for Gmail sync)
GOOGLE_CLIENT_ID=your_real_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_real_client_secret
GOOGLE_REDIRECT_URI=https://your-railway-url.up.railway.app/api/oauth2/callback

# JWT Signing (generate: openssl rand -base64 32)
OAUTH_JWT_SIGNING_KEY=your_generated_secret_here

# OpenAI (for LLM parsing - REQUIRED)
OPENAI_API_KEY=your_real_openai_key_here

# Web Origin (your Railway URL)
WEB_ORIGIN=https://your-railway-url.up.railway.app
```

## Optional (Can Use Dummy Values for Testing)

```bash
# BoostScore (only if you're using it - might be optional now)
BOOST_API_KEY=dummy-boost-api-key
BOOST_API_SECRET=dummy-boost-api-secret
BOOST_BASE_URL=https://trial-cc.boostscore.in

# CardGenius Calculator (API is open, no key needed)
CG_CALCULATOR_API_KEY=dummy-cg-key

# Session Secret (for Next.js sessions)
SESSION_SECRET=dummy-session-secret

# CORS Origin (can use WEB_ORIGIN)
CORS_ORIGIN=https://your-railway-url.up.railway.app

# Port (Railway sets automatically)
PORT=3000
```

## Recommended Minimal Setup

**For initial testing, you only need these 5:**

1. `GOOGLE_CLIENT_ID` - **REAL** (from Google Cloud Console)
2. `GOOGLE_CLIENT_SECRET` - **REAL** (from Google Cloud Console)
3. `GOOGLE_REDIRECT_URI` - Your Railway URL + `/api/oauth2/callback`
4. `OPENAI_API_KEY` - **REAL** (for statement parsing)
5. `WEB_ORIGIN` - Your Railway URL

All others can be dummy values to start!

## How to Test

1. Set the 5 critical variables above with real values
2. Set dummy values for the rest
3. Deploy and test
4. Check Railway logs for any missing variables
5. Add real values only if you encounter errors

---

## Variables That Are NOT Used Anymore

- `CG_CALCULATOR_API_KEY` - Not used (CardGenius API is open)
- `CG_CALCULATOR_BASE_URL` - Has default fallback
- `CG_CALCULATOR_PARTNER_TOKEN` - Optional, not required
- `SESSION_SECRET` - Next.js will use a default if not set
- `CORS_ORIGIN` - Can be same as WEB_ORIGIN

---

## Quick Checklist

- [ ] `GOOGLE_CLIENT_ID` - **REAL** ✅
- [ ] `GOOGLE_CLIENT_SECRET` - **REAL** ✅
- [ ] `GOOGLE_REDIRECT_URI` - **REAL** ✅
- [ ] `OPENAI_API_KEY` - **REAL** ✅
- [ ] `WEB_ORIGIN` - **REAL** ✅
- [ ] `OAUTH_JWT_SIGNING_KEY` - **GENERATE** (openssl rand -base64 32)
- [ ] All others - DUMMY is fine for testing

