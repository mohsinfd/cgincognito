# CardGenius API Documentation

## Overview

CardGenius exposes a set of REST API endpoints for statement upload, Gmail integration, and card optimization. All endpoints are proxied through our backend to keep API keys secure.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

---

## Authentication

Currently, the API uses session-based authentication (to be implemented). Gmail OAuth tokens are stored encrypted in the database.

---

## Endpoints

### 1. Upload Statement

Upload a credit card statement PDF or ZIP file.

**Endpoint:** `POST /cg/stmt/upload`

**Content-Type:** `multipart/form-data`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF or ZIP file (max 10MB) |
| `payload` | JSON string | Yes | Upload metadata (see below) |

**Payload JSON:**

```json
{
  "name": "JOHN DOE",
  "dob": "15011990",
  "bank": "hdfc",
  "card_no": "1234",
  "pass_str": "optional_password"
}
```

**Response:** `200 OK`

```json
{
  "id": "baa086b71bdb4b559891af8ae40c3391",
  "processing_eta": {
    "value": 1000,
    "unit": "ms"
  },
  "status": "PENDING",
  "message": "File Uploaded"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid payload or missing fields
- `413 Payload Too Large`: File exceeds 10MB
- `500 Internal Server Error`: Decryption failed or server error

---

### 2. Retrieve Statement Content

Poll for statement parsing results.

**Endpoint:** `GET /cg/stmt/:id/content`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Statement ID from upload response |

**Response:** `200 OK` (when completed)

```json
{
  "id": "d5bf38b493ce4ccc8060b8fae1d3a401",
  "status": "COMPLETED",
  "content": {
    "card_details": { ... },
    "owner_details": { ... },
    "summary": { ... },
    "transactions": [ ... ],
    "reward_summary": { ... }
  }
}
```

**Status Values:**

- `PENDING`: Still processing
- `COMPLETED`: Ready to consume
- `FAILED`: Processing error

**Polling Strategy:**

Start with 2s delay, increase to 3s, then 5s. Maximum 30 attempts (90s total).

---

### 3. Run Optimizer

Analyze transactions and compute missed savings.

**Endpoint:** `POST /cg/optimize`

**Content-Type:** `application/json`

**Request Body:**

```json
{
  "user_id": "uuid",
  "month": "2025-08",
  "txns": [
    {
      "txn_id": "h1",
      "statement_id": "s1",
      "txn_date": "2025-08-19",
      "amount": 700,
      "type": "Dr",
      "raw_desc": "SWIGGY",
      "cg_bucket": "dining_or_going_out"
    }
  ],
  "user_cards": ["hdfc_millennia", "sbi_cashback"]
}
```

**Response:** `200 OK`

```json
{
  "month": "2025-08",
  "total_missed": 840,
  "by_category": {
    "amazon_spends": 520,
    "dining_or_going_out": 320
  },
  "top_changes": [
    {
      "rule": "Use SBI Cashback on Amazon",
      "est_monthly_gain": 520
    }
  ],
  "findings": [ ... ]
}
```

---

### 4. Connect Gmail

Initiate Gmail OAuth flow.

**Endpoint:** `GET /gmail/connect`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `modify` | boolean | true | Include gmail.modify scope for labeling |

**Response:** `200 OK`

```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Usage:**

Redirect user to `auth_url`. After consent, user is redirected to `/oauth2/callback`.

---

### 5. Gmail OAuth Callback

Handle OAuth callback from Google.

**Endpoint:** `GET /oauth2/callback`

**Query Parameters (from Google):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code |
| `error` | string | Error message if denied |

**Response:**

Redirects to:
- Success: `/dashboard?success=true&email=user@example.com`
- Error: `/?error=oauth_failed&message=...`

---

## Error Handling

All endpoints return errors in consistent format:

```json
{
  "error": "error_code",
  "message": "Human-readable message"
}
```

**Common Error Codes:**

- `invalid_input`: Bad request parameters
- `upload_failed`: File upload error
- `decrypt_failed`: Wrong PDF password
- `processing_timeout`: Statement parsing took too long
- `oauth_failed`: Gmail authentication error

---

## Rate Limiting

**Current Limits:**

- 50 requests per minute per IP
- 429 response with `Retry-After` header

**Best Practices:**

- Cache identical spend vectors for 5-15 minutes
- Use exponential backoff for retries
- Batch operations where possible

---

## Security

- API keys never exposed to frontend
- OAuth tokens encrypted at rest
- Card numbers masked to last 2-4 digits
- All requests over HTTPS in production

---

## Versioning

Current version: `v1` (implicit)

Future versions will be prefixed: `/api/v2/...`

