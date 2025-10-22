# Gmail Integration Setup Checklist

Follow these steps to set up Gmail OAuth for your CardGenius installation.

---

## ✅ Step-by-Step Checklist

### Part 1: Google Cloud Console (10 minutes)

#### 1. Create Google Cloud Project
- [ ] Go to https://console.cloud.google.com/
- [ ] Click "Select a project" dropdown → "NEW PROJECT"
- [ ] Name: `CardGenius` (or any name)
- [ ] Click "CREATE"
- [ ] Wait for project creation (~30 seconds)

#### 2. Enable Gmail API
- [ ] In the project, go to "APIs & Services" → "Library"
- [ ] Search for "Gmail API"
- [ ] Click on it
- [ ] Click "ENABLE"
- [ ] Wait for activation (~1 minute)

#### 3. Configure OAuth Consent Screen
- [ ] Go to "APIs & Services" → "OAuth consent screen"
- [ ] Choose "External" (for testing)
- [ ] Click "CREATE"
- [ ] Fill in required fields:
  - [ ] App name: `CardGenius`
  - [ ] User support email: your-email@gmail.com
  - [ ] Developer contact: your-email@gmail.com
- [ ] Click "SAVE AND CONTINUE"

#### 4. Add OAuth Scopes
- [ ] Click "ADD OR REMOVE SCOPES"
- [ ] Search and check these scopes:
  - [ ] `https://www.googleapis.com/auth/gmail.readonly`
  - [ ] `https://www.googleapis.com/auth/gmail.modify` (optional)
  - [ ] `openid`
  - [ ] `email`
- [ ] Click "UPDATE"
- [ ] Click "SAVE AND CONTINUE"

#### 5. Add Test Users
- [ ] Click "+ ADD USERS"
- [ ] Enter your Gmail address (the one you'll test with)
- [ ] Click "ADD"
- [ ] Click "SAVE AND CONTINUE"
- [ ] Click "BACK TO DASHBOARD"

#### 6. Create OAuth Credentials
- [ ] Go to "APIs & Services" → "Credentials"
- [ ] Click "+ CREATE CREDENTIALS"
- [ ] Select "OAuth client ID"
- [ ] Application type: "Web application"
- [ ] Name: `CardGenius Web Client`
- [ ] Under "Authorized redirect URIs":
  - [ ] Click "+ ADD URI"
  - [ ] Enter: `http://localhost:3000/api/oauth2/callback`
  - [ ] (Important: Must match exactly!)
- [ ] Click "CREATE"

#### 7. Copy Credentials
- [ ] Copy the **Client ID** (looks like: `123456-abc.apps.googleusercontent.com`)
- [ ] Copy the **Client secret** (looks like: `GOCSPX-abc123...`)
- [ ] Keep these safe!

---

### Part 2: Configure Environment (2 minutes)

#### 8. Update .env.local
- [ ] Open `.env.local` in your project root
- [ ] Add these lines (replace with your actual values):

```bash
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=paste-your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=paste-your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth2/callback
```

Your complete `.env.local` should now have:
```bash
# OpenAI (for LLM parser)
OPENAI_API_KEY=sk-proj-your-key
LLM_PARSER_ENABLED=true
LLM_PARSER_PRIMARY_PROVIDER=openai

# Gmail OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth2/callback

# App
WEB_ORIGIN=http://localhost:3000
```

#### 9. Restart Server
- [ ] Stop your dev server (Ctrl+C)
- [ ] Start again: `npm run dev`
- [ ] Wait for "Ready on http://localhost:3000"

---

### Part 3: Test Gmail Connection (5 minutes)

#### 10. Test OAuth Flow
- [ ] Open browser: http://localhost:3000/gmail-test
- [ ] Click "📧 Connect Gmail" button
- [ ] Should redirect to Google consent screen
- [ ] Verify you see:
  - [ ] "CardGenius wants to access your Google Account"
  - [ ] List of permissions (View email, etc.)
- [ ] Click "Continue" or "Allow"
- [ ] Should redirect back to app
- [ ] Should show "✅ Successfully connected: your-email@gmail.com"

#### 11. Verify Connection
- [ ] Check the page shows "Connected" status
- [ ] Your email should be displayed
- [ ] No error messages

---

### Part 4: Test Gmail Search (5 minutes)

#### 12. Search for Statement Emails
- [ ] After connecting, click "🔄 Test Sync" button
- [ ] (This will show alert for now - we'll implement full search next)

#### 13. Manual API Test (Optional)
You can test the Gmail search API directly:

```bash
# Replace ACCESS_TOKEN with actual token from OAuth
curl -X POST http://localhost:3000/api/gmail/test-search \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "ya29.your-access-token",
    "query": "from:alerts@hdfcbank.net subject:statement has:attachment"
  }'
```

---

## 🎯 Success Criteria

You've successfully set up Gmail integration when:

- [x] No error messages in browser console
- [x] OAuth redirect works smoothly
- [x] Your email appears after connection
- [x] No "redirect_uri_mismatch" errors
- [x] Can see "Connected" status

---

## ❌ Troubleshooting

### Error: "redirect_uri_mismatch"
**Problem**: Redirect URI doesn't match

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Ensure redirect URI is EXACTLY: `http://localhost:3000/api/oauth2/callback`
4. No trailing slash!
5. Save and try again

### Error: "Access blocked: This app's request is invalid"
**Problem**: Not added as test user

**Solution**:
1. Go to OAuth consent screen → Test users
2. Add your Gmail address
3. Save
4. Try again

### Error: "Gmail API has not been used"
**Problem**: API not enabled yet

**Solution**:
1. Wait 1-2 minutes for API activation
2. Refresh browser
3. Try again

### Error: "This app isn't verified"
**Problem**: App is in testing mode

**Solution**:
1. This is normal for testing!
2. Click "Advanced"
3. Click "Go to CardGenius (unsafe)" - it's safe, it's your app!
4. Continue

### No statement emails found
**Problem**: Different email format

**Solution**:
1. Check your Gmail for statement emails
2. Note the sender email address
3. Update query in test to match
4. Example: `from:your-bank@bank.com subject:statement`

---

## 📧 What Happens After Setup

Once configured, the system can:

1. **Search your Gmail** for credit card statements
2. **Find emails** from banks (HDFC, Axis, SBI, etc.)
3. **Download PDF attachments** automatically
4. **Parse with LLM** (OpenAI GPT-4o-mini)
5. **Store transactions** with categories
6. **Show in dashboard** - no manual upload needed!

---

## 🔒 Security Notes

- ✅ Tokens stored encrypted in database
- ✅ Least-privilege scopes (read-only)
- ✅ You can revoke access anytime
- ✅ Only searches for statements (not all email)
- ✅ No passwords stored

---

## 🎯 Next Steps After Setup

1. Test with your actual Gmail
2. Check if your bank's statements are found
3. Test auto-parsing
4. Monitor costs (~₹1.50 per statement)
5. Set up background sync (optional)

---

## 📞 Need Help?

- Check console for errors: Browser DevTools → Console
- Check server logs in terminal
- Review [GMAIL_INTEGRATION_SETUP.md](GMAIL_INTEGRATION_SETUP.md) for detailed docs
- Test page: http://localhost:3000/gmail-test

---

**Estimated total time: ~20 minutes**

**Once done, Gmail will auto-sync statements with zero manual work!** 🎉




