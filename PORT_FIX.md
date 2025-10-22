# Port Mismatch Fix

## Problem
- OAuth callback configured for: `http://localhost:3000/api/oauth2/callback`
- Server was running on: `http://localhost:3002`
- Result: OAuth redirects failed

## Solution
Server is now running on the correct port: **3000**

## How to Always Use Port 3000

### Option 1: Use the Command File (EASIEST)
Double-click `restart-server.cmd` - it now sets `PORT=3000`

### Option 2: Manual Command
```cmd
set PORT=3000 && npm run dev
```

### Option 3: Update package.json (PERMANENT)
Edit `package.json` and change:
```json
"scripts": {
  "dev": "next dev",
}
```

To:
```json
"scripts": {
  "dev": "next dev -p 3000",
}
```

## Current Configuration
All configured for port **3000**:
- `.env.local`: `GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth2/callback`
- `.env.local`: `WEB_ORIGIN=http://localhost:3000`
- Google Cloud Console: `http://localhost:3000` (redirect URI)

## Testing
1. Server should show: `✓ Ready on http://localhost:3000`
2. Navigate to: `http://localhost:3000/gmail-test`
3. Click "Connect Gmail"
4. OAuth should redirect correctly

## Why Port Changed
Next.js automatically uses the next available port if 3000 is taken:
- 3000 taken → tries 3001
- 3001 taken → tries 3002
- etc.

Now that port 3000 is free and we're explicitly setting it, it will stay on 3000.


