# Fixing 404 Error on Railway

## The Problem

When clicking "Connect Gmail" on your Railway deployment, you get a 404 error at:
```
https://cardgenius-app-production.up.railway.app/connect
```

## Root Cause

The API route `/api/gmail/connect` is likely failing due to missing or incorrect environment variables.

## Solution: Verify These Environment Variables in Railway

Go to Railway → Your Service → **Variables** tab and verify:

### 1. Critical Variables (MUST be correct)

```bash
GOOGLE_CLIENT_ID=your_real_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_real_client_secret
GOOGLE_REDIRECT_URI=https://cardgenius-app-production.up.railway.app/api/oauth2/callback
OAUTH_JWT_SIGNING_KEY=2EeVpXGjEvUYS0WM7yJ5HBv8oPZ0DGJrUkyA6+Zzz8E=
```

### 2. Important Notes

- **GOOGLE_REDIRECT_URI** must be **EXACTLY**:
  ```
  https://cardgenius-app-production.up.railway.app/api/oauth2/callback
  ```
  - NO trailing slash
  - Must use `https://` (not `http://`)
  - Must match what you entered in Google Cloud Console

### 3. Check Railway Logs

Go to Railway → **Deployments** → **View Logs** and look for:
- Missing environment variable errors
- Google OAuth initialization errors
- Any 500 errors

---

## Quick Checklist

- [ ] `GOOGLE_CLIENT_ID` set in Railway
- [ ] `GOOGLE_CLIENT_SECRET` set in Railway  
- [ ] `GOOGLE_REDIRECT_URI` matches Railway URL exactly
- [ ] `OAUTH_JWT_SIGNING_KEY` added with generated value
- [ ] Google Cloud Console has the Railway redirect URI configured
- [ ] Railway has redeployed after adding variables

---

## Next Steps

1. Add `OAUTH_JWT_SIGNING_KEY` to Railway variables
2. Verify all other variables are set correctly
3. Check Railway logs for errors
4. Try connecting again

If still getting 404, share the Railway logs and I'll help debug further.

