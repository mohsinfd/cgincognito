# Gmail Integration Setup Guide

Complete guide to set up Gmail OAuth for automatic statement syncing.

---

## 🎯 Overview

The Gmail integration allows users to:
1. **Connect their Gmail account** via OAuth
2. **Auto-detect statement emails** from banks
3. **Auto-download PDF attachments**
4. **Auto-parse with LLM** (no manual upload)
5. **Background sync** every 15 minutes

---

## 📋 Prerequisites

- Google Cloud Project
- Gmail account for testing
- OpenAI API key (already configured)

---

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project (5 minutes)

1. **Go to Google Cloud Console**:
   https://console.cloud.google.com/

2. **Create New Project**:
   - Click "Select a project" → "New Project"
   - Name: `CardGenius Dev`
   - Click "Create"

3. **Enable Gmail API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

---

### Step 2: Create OAuth Credentials (5 minutes)

1. **Go to Credentials**:
   - APIs & Services → Credentials
   - Click "+ CREATE CREDENTIALS"
   - Select "OAuth client ID"

2. **Configure OAuth Consent Screen** (if first time):
   - Click "Configure Consent Screen"
   - Choose "External" (for testing)
   - Fill in:
     - App name: `CardGenius`
     - User support email: your-email@gmail.com
     - Developer email: your-email@gmail.com
   - Click "Save and Continue"
   
3. **Add Scopes**:
   - Click "ADD OR REMOVE SCOPES"
   - Search and add:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify` (optional)
     - `openid`
     - `email`
   - Click "Update" → "Save and Continue"

4. **Add Test Users**:
   - Click "+ ADD USERS"
   - Add your Gmail address
   - Click "Save and Continue"

5. **Create OAuth Client**:
   - Back to: Credentials → "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: "Web application"
   - Name: `CardGenius Web Client`
   - Authorized redirect URIs:
     - Add: `http://localhost:3000/api/oauth2/callback`
   - Click "Create"

6. **Save Credentials**:
   - Copy the **Client ID** (looks like: `123456-abc.apps.googleusercontent.com`)
   - Copy the **Client Secret** (looks like: `GOCSPX-abc123...`)

---

### Step 3: Configure Environment (2 minutes)

Add to your `.env.local`:

```bash
# Gmail OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth2/callback

# Optional: OAuth JWT signing
OAUTH_JWT_SIGNING_KEY=your-random-secret-key-here
```

---

### Step 4: Test the Integration (10 minutes)

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Test OAuth Flow**:
   - Visit: http://localhost:3000/api/gmail/connect
   - Response should be JSON with `auth_url`
   - Copy the `auth_url` and open in browser
   - Grant permissions
   - Should redirect back to your app

3. **Test with UI** (if UI is built):
   - Visit: http://localhost:3000
   - Click "Connect Gmail" button
   - Complete OAuth flow
   - Should see "Connected: your-email@gmail.com"

---

## 🧪 Testing Gmail Search

Once connected, you can test searching for statements:

### Manual Test API Call:

```bash
# Get access token (you'll need to store this from OAuth callback)
# Then test search:

curl -X POST http://localhost:3000/api/gmail/search \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "query": "from:alerts@hdfcbank.net subject:statement has:attachment"
  }'
```

---

## 📧 Bank Email Queries

The system already has queries for top Indian banks built-in:

```javascript
// In: src/types/gmail.ts

HDFC:  from:(alerts@hdfcbank.net) subject:(Credit Card e-Statement)
SBI:   from:(donotreply@sbicard.com) subject:(statement)
ICICI: from:(noreply@icicibank.com) subject:(Credit Card Statement)
Axis:  from:(alerts@axisbank.com) subject:(Card e-Statement)
Kotak: from:(kotakcreditcard@kotak.com) subject:(Statement)
HSBC:  from:(no.reply@hsbc.co.in) subject:(Credit Card e-Statement)
... and more
```

---

## 🔄 Background Sync Setup

### Option 1: Manual Trigger (For Testing)

Create a test endpoint to manually trigger sync:

```bash
curl -X POST http://localhost:3000/api/gmail/sync \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id"}'
```

### Option 2: Cron Job (Production)

For automated syncing every 15 minutes, use:

**Vercel Cron** (if deploying to Vercel):
```json
// vercel.json
{
  "crons": [{
    "path": "/api/gmail/sync-all",
    "schedule": "*/15 * * * *"
  }]
}
```

**Or Local Cron** (for development):
```bash
# Add to crontab
*/15 * * * * curl -X POST http://localhost:3000/api/gmail/sync-all
```

---

## 🎨 Frontend Integration

### Add "Connect Gmail" Button

Create or update `src/app/page.tsx`:

```tsx
'use client';

import { useState } from 'react';

export default function HomePage() {
  const [connecting, setConnecting] = useState(false);

  const connectGmail = async () => {
    setConnecting(true);
    try {
      const response = await fetch('/api/gmail/connect');
      const data = await response.json();
      
      if (data.auth_url) {
        // Redirect to Google OAuth
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Failed to connect Gmail:', error);
      alert('Failed to connect Gmail');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">CardGenius</h1>
        
        {/* Gmail Connect Button */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Connect Gmail</h2>
          <p className="text-gray-600 mb-4">
            Auto-sync credit card statements from your Gmail
          </p>
          <button
            onClick={connectGmail}
            disabled={connecting}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {connecting ? 'Connecting...' : '📧 Connect Gmail'}
          </button>
        </div>

        {/* Manual Upload */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Or Upload Manually</h2>
          <a
            href="/upload"
            className="bg-green-600 text-white px-6 py-3 rounded-lg inline-block hover:bg-green-700"
          >
            📤 Upload Statement
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

## 🧪 Testing Checklist

### Phase 1: OAuth Flow
- [ ] Can click "Connect Gmail"
- [ ] Redirects to Google consent screen
- [ ] Can grant permissions
- [ ] Redirects back to app
- [ ] Tokens stored in database (encrypted)

### Phase 2: Gmail Search
- [ ] Can search for statement emails
- [ ] Returns correct results
- [ ] Can list attachments
- [ ] Can download PDFs

### Phase 3: Auto-Parse
- [ ] Downloads PDF from Gmail
- [ ] Parses with LLM successfully
- [ ] Stores transactions in database
- [ ] Shows in user dashboard

### Phase 4: Background Sync
- [ ] Cron job triggers
- [ ] Syncs all connected users
- [ ] Handles errors gracefully
- [ ] Deduplicates statements

---

## 🔒 Security Notes

1. **Tokens are encrypted** using AES-256-GCM before storage
2. **Least-privilege scopes** (only gmail.readonly required)
3. **Refresh tokens** stored separately
4. **User can revoke** access anytime
5. **One-tap delete** removes all data

---

## 📊 Expected Results

After setup, your personal account should:

1. **Connect successfully** via OAuth
2. **Find your statement emails** automatically
3. **Download PDFs** in background
4. **Parse with LLM** (costs ₹1.50 per statement)
5. **Show in dashboard** with categories

**Time savings**: No more manual uploads! ⏰

---

## 🐛 Troubleshooting

### Error: "redirect_uri_mismatch"
- Check redirect URI in Google Console matches exactly
- Must be: `http://localhost:3000/api/oauth2/callback`

### Error: "Access blocked: This app's request is invalid"
- Add your Gmail to "Test users" in OAuth consent screen
- App must be in "Testing" mode

### Error: "Gmail API has not been used"
- Enable Gmail API in Google Cloud Console
- Wait 1-2 minutes for activation

### No statements found
- Check if you have statement emails in Gmail
- Verify email address matches queries
- Check spam/trash folders

---

## 🎯 Next Steps After Setup

1. Test with your personal Gmail
2. Check if statements are found
3. Verify auto-parsing works
4. Monitor costs (should be ~₹1.50 per statement)
5. Set up background sync

---

## 📞 Need Help?

Check existing implementation:
- OAuth flow: `src/lib/gmail/oauth.ts`
- Gmail client: `src/lib/gmail/client.ts`
- API routes: `src/app/api/gmail/` and `src/app/api/oauth2/`
- Types: `src/types/gmail.ts`

---

**Ready to connect your Gmail?** Follow Step 1-4 above! 🚀




