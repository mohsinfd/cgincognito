# Security & Privacy

CardGenius is built with security and privacy as core principles. This document outlines our security measures and compliance approach.

---

## Security Architecture

### 1. Least-Privilege OAuth

**Gmail Access:**
- **Required scope:** `gmail.readonly` - read-only access to Gmail
- **Optional scope:** `gmail.modify` - only for applying labels
- **Identity scopes:** `openid email` - basic user identity

**What We Don't Access:**
- Other emails (only statement emails matching specific queries)
- Email content beyond attachments
- Gmail settings or contacts
- Google Drive or other services

### 2. API Key Management

**Server-Side Only:**
- BoostScore API keys injected server-side via proxy
- CardGenius Calculator credentials server-side only
- **Never** exposed to browser/frontend

**Environment Variables:**
```bash
# Stored securely in deployment platform
BOOST_API_KEY=...
BOOST_API_SECRET=...
GOOGLE_CLIENT_SECRET=...
ENCRYPTION_KMS_KEY=...
```

### 3. Encryption

**At Rest:**
- OAuth tokens encrypted using KMS-backed keys
- Database encryption enabled (Supabase/RDS)
- Password-protected PDFs handled securely

**In Transit:**
- HTTPS/TLS 1.3 for all connections
- Secure WebSockets where applicable

### 4. Data Masking

**Card Numbers:**
- Full PAN never stored
- Only last 2-4 digits retained
- Example: `XXXX XXXX XXXX 1234`

**Personal Information:**
- Name and DOB used only for parsing
- No addresses or SSN/Aadhaar stored
- Email from OAuth only (no password)

---

## Privacy Guarantees

### What We Collect

1. **From Gmail:**
   - Email addresses of statement senders
   - Attachment files (PDF/ZIP statements)
   - Message IDs for deduplication

2. **From Statements:**
   - Transaction descriptions (masked merchants)
   - Amounts and dates
   - Card last 2-4 digits
   - Bank codes

3. **From Users:**
   - Email address (via OAuth)
   - Consent timestamp
   - Feature preferences

### What We DON'T Collect

- Full credit card numbers (PANs)
- CVV or PIN codes
- Email content beyond statements
- Physical addresses
- Phone numbers (unless explicitly provided)
- Aadhaar or SSN

### Data Retention

**Default:** 180 days

**User Controls:**
- Change retention period in settings
- One-tap data deletion
- Automatic purge after retention period

---

## Compliance Checklist

### OAuth Security

- [x] Least-privilege scopes
- [x] Consent screen with clear descriptions
- [x] Refresh token stored encrypted
- [x] Token revocation on disconnect
- [x] Google OAuth verification (required for production)

### API Security

- [x] Secrets server-side only
- [x] HTTPS enforced (production)
- [x] CORS restrictions
- [x] Rate limiting (50 req/min)
- [x] Input validation (JSON schemas)

### Data Protection

- [x] Encryption at rest (KMS-backed)
- [x] Masked PAN (last 2-4 only)
- [x] No plaintext passwords
- [x] Consent timestamp stored
- [x] One-tap delete + revoke

### Operational Security

- [x] Audit logs for data access
- [x] WAF/DDoS protection (Cloudflare)
- [x] Regular dependency updates
- [x] Security headers (CSP, HSTS)

---

## User Rights

### Data Access

Users can:
- View all stored data via dashboard
- Export data as JSON
- See connected accounts and scopes

### Data Deletion

**One-Tap Delete:**
```sql
-- All related data removed atomically
DELETE FROM gmail_accounts WHERE user_id = ?;
-- Cascades to statements, transactions, snapshots, results
```

**Token Revocation:**
- OAuth tokens revoked via Google API
- User immediately logged out

### Consent Management

Users can:
- Disconnect Gmail anytime
- Revoke specific scopes
- Change retention settings
- Opt out of analytics

---

## Incident Response

### Data Breach Protocol

1. **Immediate Actions:**
   - Isolate affected systems
   - Rotate all API keys and secrets
   - Notify affected users (< 72 hours)

2. **Forensics:**
   - Review audit logs
   - Identify breach vector
   - Document timeline

3. **Remediation:**
   - Patch vulnerabilities
   - Force password resets if needed
   - Update security measures

4. **Reporting:**
   - Notify regulatory authorities (if required)
   - Public disclosure (if material)

### Contact

Security issues: security@cardgenius.com (to be set up)

---

## Security Best Practices for Developers

### Code Review

- No secrets in source code
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS prevention (React escapes by default)

### Testing

- Penetration testing before launch
- Dependency scanning (Dependabot)
- Static analysis (ESLint, TypeScript strict)

### Deployment

- Environment variables via platform secrets
- Minimal IAM permissions
- Immutable infrastructure
- Blue-green deployments

---

## Certifications & Standards

**Planned:**
- SOC 2 Type II (within 12 months)
- ISO 27001 (within 18 months)
- PCI DSS compliance (if storing card data)

**Current:**
- HTTPS/TLS 1.3
- OWASP Top 10 compliance
- Google OAuth verified app

---

## Updates

This document is reviewed quarterly. Last updated: 2025-09-30

For questions, contact: privacy@cardgenius.com

