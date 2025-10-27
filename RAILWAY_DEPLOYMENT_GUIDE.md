# Railway Deployment Guide for CardGenius

## Overview
This guide walks you through deploying CardGenius to Railway for production testing with Google OAuth.

---

## Step 1: Push Your Code to GitHub

```powershell
# Make sure all changes are committed
git add .
git commit -m "Ready for production deployment - pre-categorizer, auto-fill, multi-card support"
git push origin main
```

---

## Step 2: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub (recommended)
3. Connect your GitHub account
4. Create a new project

---

## Step 3: Deploy Your Application

### A. Select Repository
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your CardGenius repository
- Click "Deploy Now"

### B. Railway Auto-Detection
- Railway will detect Next.js automatically
- Use these settings:
  - **Build Command**: `npm run build`
  - **Start Command**: `npm start`
  - **Root Directory**: `/` (root)

---

## Step 4: Configure Environment Variables

In Railway dashboard → Your Service → Variables tab, add:

### Required Variables:

```bash
# Google OAuth (get these from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://your-app-name.up.railway.app/api/oauth2/callback

# OpenAI (for LLM parsing)
OPENAI_API_KEY=your_openai_key_here

# CardGenius API (for optimization)
CG_API_KEY=your_cardgenius_key_here

# Database (if using Supabase/PostgreSQL)
DATABASE_URL=your_database_url_here

# Node Environment
NODE_ENV=production

# Port (Railway sets this automatically)
PORT=3000
```

### Optional Variables:

```bash
# Web Origin (for frontend CORS)
WEB_ORIGIN=https://your-app-name.up.railway.app

# BoostScore API (if using)
BOOSTSCORE_API_KEY=your_boostscore_key
BOOSTSCORE_API_SECRET=your_boostscore_secret
```

---

## Step 5: Get Your Railway Domain

1. Railway provides a `.up.railway.app` domain automatically
2. Go to Settings → Domains
3. Copy your URL (e.g., `cardgenius-abc123.up.railway.app`)

---

## Step 6: Configure Google OAuth

### A. Google Cloud Console Setup

1. Go to https://console.cloud.google.com
2. Create/Select project: "CardGenius Production"
3. Enable **Gmail API**:
   - APIs & Services → Library
   - Search "Gmail API"
   - Click "Enable"

### B. Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **"Create Credentials" → "OAuth 2.0 Client ID"**
3. Application type: **Web application**
4. Name: **CardGenius Production**
5. **Authorized JavaScript origins**:
   ```
   https://your-app-name.up.railway.app
   ```
6. **Authorized redirect URIs**:
   ```
   https://your-app-name.up.railway.app/api/oauth2/callback
   ```
7. Click **"Create"**
8. Copy:
   - **Client ID** → `GOOGLE_CLIENT_ID`
   - **Client Secret** → `GOOGLE_CLIENT_SECRET`

### C. OAuth Consent Screen

1. **APIs & Services → OAuth consent screen**
2. User Type: **External** (for now)
3. App name: **CardGenius**
4. User support email: **Your email**
5. Developer contact: **Your email**
6. **Scopes** (click "Add or Remove Scopes"):
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
7. Save

### D. Add Test Users (Important!)

1. **OAuth consent screen → Test users**
2. Click **"Add Users"**
3. Add **your own email** and **test user emails**
4. Save

---

## Step 7: Update Environment Variables in Railway

1. Railway dashboard → Your Service → Variables
2. Update `GOOGLE_REDIRECT_URI`:
   ```
   https://your-actual-domain.up.railway.app/api/oauth2/callback
   ```
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
4. Click **"Redeploy"** button

---

## Step 8: Test Deployment

1. Visit your Railway URL: `https://your-app-name.up.railway.app`
2. Click "Connect Gmail"
3. Sign in with your test account
4. Grant Gmail access
5. Test statement sync

---

## Step 9: Monitor & Debug

### Railway Logs
- Railway dashboard → Deployments → View Logs
- Look for errors during build/start

### Common Issues

**Issue**: Build fails
- **Solution**: Check `package.json` engines match Railway Node version

**Issue**: `qpdf-bin` not found
- **Solution**: Railway may not support native binaries; consider removing `qpdf-bin` dependency

**Issue**: OAuth redirect fails
- **Solution**: Verify redirect URI matches exactly in Google Console

**Issue**: Environment variables not working
- **Solution**: Click "Redeploy" after adding variables

---

## Step 10: Custom Domain (Optional)

### A. In Railway:
1. Settings → Domains → Generate Domain
2. Add custom domain (e.g., `cardgenius.yourdomain.com`)
3. Railway provides DNS records

### B. Update DNS:
1. Add CNAME record:
   ```
   cardgenius → your-app-name.up.railway.app
   ```
2. Wait for DNS propagation (5-10 minutes)

### C. Update Google OAuth:
1. Add new domain to Authorized origins
2. Add new redirect URI
3. Redeploy Railway

---

## Production Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] All environment variables set
- [ ] Google OAuth configured
- [ ] Test users added to OAuth consent screen
- [ ] Application deployed successfully
- [ ] Gmail connection tested
- [ ] Statement sync tested
- [ ] Dashboard loads correctly
- [ ] Custom domain configured (optional)

---

## Cost Estimation

**Railway**:
- Free tier: $5 credit/month
- Hobby plan: $5/month (after free tier)
- Includes: 512MB RAM, 1GB storage

**OpenAI**:
- GPT-4o-mini: ~$0.15 per 1M tokens
- Estimated: $2-5/month for testing

**Total**: ~$7-10/month for internal testing

---

## Next Steps After Deployment

1. Add more test users to OAuth consent screen
2. Monitor Railway logs for errors
3. Test all functionality end-to-end
4. Gather feedback from internal users
5. Fix bugs based on feedback
6. When ready, submit for Google OAuth verification (for public access)

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

