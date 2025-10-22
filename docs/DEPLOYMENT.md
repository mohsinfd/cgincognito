# Deployment Guide

This guide covers deploying CardGenius to various platforms.

---

## Prerequisites

Before deploying, ensure you have:

1. **Google Cloud Project** with Gmail API enabled
2. **BoostScore API credentials** (trial or production)
3. **Database** (Supabase or Postgres)
4. **Encryption keys** generated
5. **Domain name** (for production)

---

## Environment Setup

### 1. Create Environment Variables

Copy `.env.example` to `.env.local` (development) or configure in your deployment platform.

**Required Variables:**

```bash
# BoostScore
BOOST_BASE_URL=https://trial-cc.boostscore.in
BOOST_API_KEY=your_api_key
BOOST_API_SECRET=your_api_secret

# Gmail OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/oauth2/callback
OAUTH_JWT_SIGNING_KEY=<generate with: openssl rand -base64 32>

# Database
DATABASE_URL=postgresql://user:pass@host:5432/cardgenius

# Encryption
ENCRYPTION_KMS_KEY=<generate with: openssl rand -base64 32>

# App
WEB_ORIGIN=https://your-domain.com
MAX_UPLOAD_MB=10
NODE_ENV=production
```

### 2. Database Setup

**Run Migrations:**

```bash
# For Supabase
psql $DATABASE_URL < src/db/schema.sql

# Or use migration tool
npm run db:migrate
```

**Verify Tables:**

```sql
\dt  -- List tables
SELECT * FROM bank_codes;  -- Should show 12 rows
```

---

## Deployment Options

### Option 1: Vercel (Recommended)

**Advantages:**
- Zero-config Next.js deployment
- Edge functions for proxy
- Auto-scaling
- Built-in preview deployments

**Steps:**

1. **Install Vercel CLI:**

```bash
npm install -g vercel
```

2. **Link Project:**

```bash
vercel link
```

3. **Set Environment Variables:**

```bash
# Via CLI
vercel env add BOOST_API_KEY
vercel env add BOOST_API_SECRET
# ... add all variables

# Or via Vercel Dashboard
# Project Settings → Environment Variables
```

4. **Deploy:**

```bash
# Preview
vercel

# Production
vercel --prod
```

5. **Configure Domain:**

Go to Vercel Dashboard → Domains → Add your domain

**Post-Deployment:**

- Update `GOOGLE_REDIRECT_URI` to match your domain
- Update `WEB_ORIGIN` to your domain
- Re-configure Google OAuth redirect URIs

---

### Option 2: Cloudflare Workers + Pages

**Advantages:**
- Global edge network
- Very low latency
- Generous free tier

**Steps:**

1. **Install Wrangler:**

```bash
npm install -g wrangler
wrangler login
```

2. **Create Worker for Proxy:**

```bash
wrangler init cg-proxy
```

3. **Deploy Pages (Frontend):**

```bash
npm run build
wrangler pages publish .next
```

4. **Configure Secrets:**

```bash
wrangler secret put BOOST_API_KEY
wrangler secret put BOOST_API_SECRET
# ... add all secrets
```

5. **Set Up Custom Domain:**

```bash
wrangler pages domain add your-domain.com
```

---

### Option 3: Self-Hosted (Docker)

**Advantages:**
- Full control
- Can use any VPS/cloud provider
- Cost-effective at scale

**Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Docker Compose:**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - BOOST_API_KEY=${BOOST_API_KEY}
      # ... other env vars
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: cardgenius
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./src/db/schema.sql:/docker-entrypoint-initdb.d/schema.sql

volumes:
  pgdata:
```

**Deploy:**

```bash
docker-compose up -d
```

---

## Google OAuth Configuration

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Gmail API**
4. Go to **Credentials** → Create OAuth 2.0 Client ID
5. Application type: **Web application**
6. Authorized redirect URIs:
   - Development: `http://localhost:3000/oauth2/callback`
   - Production: `https://your-domain.com/oauth2/callback`

### 2. Configure OAuth Consent Screen

1. Go to **OAuth consent screen**
2. User type: **External**
3. App name: **CardGenius**
4. Scopes:
   - `gmail.readonly`
   - `gmail.modify` (optional)
   - `openid`
   - `email`
5. Test users: Add your email for testing

### 3. Verification (Production)

For public launch:
1. Fill out OAuth verification form
2. Provide privacy policy and terms
3. Domain verification
4. Google review (can take 1-2 weeks)

---

## Database Migrations

### Running Migrations

**Initial Setup:**

```bash
psql $DATABASE_URL < src/db/schema.sql
```

**Future Migrations:**

Create migration files in `src/db/migrations/`:

```sql
-- 001_add_card_caps.sql
CREATE TABLE card_caps (
  ...
);
```

Run:

```bash
npm run db:migrate
```

---

## Monitoring & Logging

### Vercel

Built-in monitoring via dashboard:
- Function logs
- Error tracking
- Performance metrics

### Custom Logging

Use structured logging:

```typescript
console.log(JSON.stringify({
  level: 'info',
  message: 'Statement uploaded',
  user_id: userId,
  bank_code: bankCode,
  timestamp: new Date().toISOString(),
}));
```

### Error Tracking

Integrate Sentry:

```bash
npm install @sentry/nextjs
```

Configure in `next.config.js`:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // ... your Next.js config
}, {
  dsn: process.env.SENTRY_DSN,
});
```

---

## Performance Optimization

### 1. Caching

**Spend Vector Results:**

Cache identical spend vectors for 5-15 minutes:

```typescript
const cacheKey = hashSpendVector(vector);
const cached = await redis.get(cacheKey);
if (cached) return cached;
```

**Bank Codes:**

Static JSON in frontend (no API call needed)

### 2. CDN

Use Vercel Edge Network or Cloudflare CDN for:
- Static assets
- API responses (where appropriate)

### 3. Database Indexes

Ensure indexes on:
- `statements.user_id`
- `transactions.statement_id`
- `transactions.txn_date`
- `spend_snapshot_monthly(user_id, month)`

---

## Security Checklist

Before going live:

- [ ] HTTPS enabled (automatic on Vercel/Cloudflare)
- [ ] Environment variables secured (never in git)
- [ ] OAuth consent screen configured
- [ ] Rate limiting enabled
- [ ] CORS configured (`WEB_ORIGIN` only)
- [ ] Security headers set (CSP, HSTS)
- [ ] Database backups enabled
- [ ] Monitoring/alerts configured

---

## Rollback Procedure

### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback <deployment-url>
```

### Docker

```bash
# Stop current
docker-compose down

# Deploy previous version
docker-compose up -d --build <previous-tag>
```

---

## Troubleshooting

### Gmail OAuth Not Working

- Check redirect URI matches exactly (no trailing slash)
- Verify scopes are correct
- Check if app is in "testing" mode (limit 100 users)

### Statement Parsing Fails

- Check BoostScore API credentials
- Verify PDF is not corrupted
- Try providing password if protected

### Database Connection Issues

- Check `DATABASE_URL` format
- Verify firewall rules (allow app IP)
- Test connection: `psql $DATABASE_URL`

---

## Support

For deployment issues:
- GitHub Issues: https://github.com/your-org/cardgenius
- Email: devops@cardgenius.com

