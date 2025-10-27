# Production Deployment Checklist

## Pre-Deployment

- [ ] All code committed to GitHub
- [ ] Tests passing locally
- [ ] No TypeScript errors
- [ ] No ESLint errors

## Railway Setup

- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Deploy application
- [ ] Note Railway domain (e.g., `cardgenius-abc123.up.railway.app`)

## Environment Variables

Copy these to Railway → Variables:

```bash
# Core
NODE_ENV=production
PORT=3000

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-domain.up.railway.app/api/oauth2/callback

# OpenAI
OPENAI_API_KEY=

# CardGenius API
CG_API_KEY=

# Optional
WEB_ORIGIN=https://your-domain.up.railway.app
```

## Google OAuth Setup

- [ ] Create Google Cloud project
- [ ] Enable Gmail API
- [ ] Create OAuth 2.0 credentials
- [ ] Configure OAuth consent screen
- [ ] **Add test users** (important!)
- [ ] Add authorized origins: `https://your-domain.up.railway.app`
- [ ] Add redirect URI: `https://your-domain.up.railway.app/api/oauth2/callback`

## Testing

- [ ] Application loads on Railway URL
- [ ] Gmail connect button works
- [ ] OAuth flow completes successfully
- [ ] Test users can sign in
- [ ] Statement sync works
- [ ] Dashboard loads with data
- [ ] Optimization recommendations show

## Common Issues & Fixes

### Build Fails
- Check Node version compatibility
- Remove `qpdf-bin` if causing issues
- Check all dependencies in `package.json`

### OAuth Errors
- Verify redirect URI matches exactly
- Check test users are added
- Ensure domains are added to authorized origins

### Runtime Errors
- Check Railway logs
- Verify all environment variables are set
- Ensure API keys are valid

## First Internal User

- [ ] Send Railway URL to internal tester
- [ ] Add tester email to Google OAuth test users
- [ ] Monitor Railway logs during their session
- [ ] Gather feedback

## Estimated Time: 30-45 minutes

