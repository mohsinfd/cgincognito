# Railway Production Setup Guide

Now that your Railway deployment is successful, follow these steps to configure Google OAuth for production.

## Step 1: Get Your Railway Production URL

1. Go to your Railway dashboard
2. Click on your deployed service
3. Find the **Domain** section
4. Copy your production URL (e.g., `https://cardgenius-app.up.railway.app`)

---

## Step 2: Update Google OAuth Credentials

### A. Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project (or create a new one)
3. Go to **APIs & Services** → **Credentials**

### B. Add Production Redirect URI

1. Click on your OAuth 2.0 Client ID
2. Under **Authorized redirect URIs**, add:
   ```
   https://your-railway-url.up.railway.app/api/oauth2/callback
   ```
3. Click **Save**

### C. Add to Authorized JavaScript Origins (if needed)

Add your Railway domain:
```
https://your-railway-url.up.railway.app
```

---

## Step 3: Configure Railway Environment Variables

Go to your Railway project → **Variables** tab and add these:

### Required Variables:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-railway-url.up.railway.app/api/oauth2/callback

# JWT Signing Key (generate new one for production)
OAUTH_JWT_SIGNING_KEY=<generate with: openssl rand -base64 32>

# Web Origin
WEB_ORIGIN=https://your-railway-url.up.railway.app

# BoostScore API
BOOST_API_KEY=your_api_key
BOOST_API_SECRET=your_api_secret
BOOST_BASE_URL=https://trial-cc.boostscore.in

# LLM APIs
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key (optional)
GOOGLE_AI_API_KEY=your_google_ai_key (optional)

# Database (if using Supabase)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# App Config
NODE_ENV=production
MAX_UPLOAD_MB=10
```

### Generate JWT Signing Key:

```bash
openssl rand -base64 32
```

Copy the output and paste it as `OAUTH_JWT_SIGNING_KEY` value.

---

## Step 4: Redeploy After Environment Variables

After adding environment variables:

1. Railway will automatically redeploy
2. Wait for deployment to complete (check the **Deployments** tab)
3. Go to your Railway URL in a browser

---

## Step 5: Test Gmail OAuth Flow

1. Visit: `https://your-railway-url.up.railway.app/gmail-test`
2. Click **Connect Gmail**
3. You should be redirected to Google OAuth consent screen
4. After granting access, you should be redirected back to your app

---

## Troubleshooting

### "Redirect URI mismatch" Error

- Make sure `GOOGLE_REDIRECT_URI` in Railway exactly matches what's in Google Cloud Console
- No trailing slashes: use `/api/oauth2/callback` not `/api/oauth2/callback/`
- Protocol must match: `https://` (Railway uses HTTPS by default)

### "Access Denied" Error

- Your Google OAuth app might be in "Testing" mode (limited to 100 users)
- Check **OAuth consent screen** → **Publishing status**

### OAuth Working But Statements Not Parsing

- Check `BOOST_API_KEY` and `BOOST_API_SECRET` are set correctly
- Check Railway logs for errors during statement processing

---

## Next Steps

1. ✅ Set up Google OAuth redirect URI
2. ✅ Configure Railway environment variables
3. ✅ Test OAuth flow
4. 📧 Share Railway URL with internal testers
5. 📊 Monitor Railway logs for errors
6. 🔒 Set up custom domain (optional)

---

## Optional: Custom Domain

To use your own domain:

1. Go to Railway project → **Settings** → **Domains**
2. Click **Generate Domain**
3. Or add custom domain:
   - Domain: `cardgenius.yourdomain.com`
   - Railway will provide DNS instructions
4. Update `GOOGLE_REDIRECT_URI` and `WEB_ORIGIN` with new domain
5. Railway will automatically redeploy

---

## Environment Variables Reference

Here's a complete list of all environment variables you might need:

```bash
# === Google OAuth ===
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
OAUTH_JWT_SIGNING_KEY=

# === App Config ===
WEB_ORIGIN=
NODE_ENV=production
MAX_UPLOAD_MB=10

# === BoostScore API ===
BOOST_API_KEY=
BOOST_API_SECRET=
BOOST_BASE_URL=https://trial-cc.boostscore.in

# === LLM APIs ===
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# === Database ===
DATABASE_URL=

# === Encryption (if used) ===
ENCRYPTION_KMS_KEY=
```

---

## Support

If you encounter issues:
1. Check Railway logs: **Project** → **Deployments** → **View Logs**
2. Check browser console for errors
3. Verify all environment variables are set correctly

