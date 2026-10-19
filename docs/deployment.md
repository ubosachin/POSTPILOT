# PostPilot — Production Deployment & Operations Guide

This guide provides step-by-step instructions for deploying PostPilot to production across Vercel (Next.js web application), Redis & BullMQ (background job queue), MongoDB Atlas (persistent multi-tenant data store), and persistent container workers (Render / Railway / Fly.io).

---

## 1. Environment Configuration

Copy `.env.example` to `.env.production` or configure the following variables in your hosting provider's secrets manager:

| Environment Variable | Description | Example / Recommended Value |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Canonical public URL of the application | `https://app.postpilot.io` |
| `NODE_ENV` | Runtime environment | `production` |
| `MONGODB_URI` | MongoDB Atlas replica-set connection string | `mongodb+srv://admin:<password>@cluster0.xyz.mongodb.net/postpilot?retryWrites=true&w=majority` |
| `REDIS_URL` | Redis instance for BullMQ background queues | `rediss://default:<password>@redis.your-cloud-provider.com:6379` |
| `JWT_SECRET` | 32+ character high-entropy key for session tokens | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | 64-hex-char (32 bytes) key for AES-256-GCM credential vault | `openssl rand -hex 32` |
| `GEMINI_API_KEY` | Google Gemini API Key for AI variant generation | Configured in Google Cloud Console |
| `OPENAI_API_KEY` | (Optional) Alternative LLM provider | `sk-...` |
| `BLUESKY_SERVICE_URL` | Bluesky PDS / Entrypoint | `https://bsky.social` |
| `X_API_KEY` | X (Twitter) API v2 Developer App Key | Formatted from developer.x.com |
| `X_API_SECRET` | X API v2 Developer App Secret | Secret key from developer.x.com |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (Live or Test) | `rzp_live_...` or `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | Secret from Razorpay Dashboard |
| `RAZORPAY_WEBHOOK_SECRET`| Razorpay Webhook Signing Secret | HMAC signature secret |

### Generating Secure Cryptographic Keys

Run the following commands locally to generate your production secrets:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY (64 hex characters / 32 bytes)
openssl rand -hex 32
```

---

## 2. Database Setup: MongoDB Atlas

PostPilot uses MongoDB with Mongoose for tenant-isolated data models.

1. **Create an Atlas Cluster**:
   - Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - Create a Dedicated (M10+) or Serverless cluster in the region closest to your app servers.
2. **Network Access**:
   - Add your Vercel IP ranges or allow access from anywhere (`0.0.0.0/0`) protected by strong database user credentials and TLS.
3. **Database Indexes**:
   The application initializes the following critical indexes automatically upon model initialization:
   - `users.email` (Unique)
   - `workspaces.ownerId`
   - `workspace_memberships.[workspaceId, userId]` (Compound Unique)
   - `credit_wallets.workspaceId` (Unique)
   - `credit_ledger_entries.[workspaceId, createdAt]`
   - `credit_reservations.[workspaceId, status]`
   - `publishing_jobs.[status, scheduledAt]`
   - `publishing_jobs.idempotencyKey` (Unique)
   - `social_accounts.[workspaceId, platform]`
   - `payment_orders.orderId` (Unique)
   - `content_automations.[workspaceId, status]`

---

## 3. Web Application Deployment on Vercel

The frontend and serverless API endpoints are optimized for Vercel.

1. **Connect Repository**:
   - Import the `PostPilot` GitHub repository into [Vercel](https://vercel.com).
2. **Framework Preset**:
   - Next.js (automatically detected).
3. **Build & Output Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. **Environment Variables**:
   - Paste all production variables listed in Section 1.
5. **Deploy**:
   - Click **Deploy**. Vercel will build the 42 optimized static and dynamic routes.

---

## 4. Persistent Background Worker Deployment

Background job processing, exponential retry backoff, and scheduled publishing are powered by BullMQ and Redis. Because Vercel serverless functions have execution timeouts, the publisher worker must run as a persistent container process.

### Recommended Providers:
- **Render** (Background Worker service)
- **Railway** (Standalone Node Worker service)
- **Fly.io** (`fly launch` with worker process)
- **AWS ECS / DigitalOcean App Platform**

### Worker Configuration (Render / Railway):
1. **Repository**: Same `PostPilot` repository.
2. **Environment Variables**: Same `MONGODB_URI`, `REDIS_URL`, `ENCRYPTION_KEY`, and platform secrets.
3. **Start Command**:
   ```bash
   npm run worker
   ```
4. **Health & Graceful Shutdown**:
   The worker listens to `SIGTERM` and `SIGINT`, finishing any active publishing job before exiting safely without leaving orphaned distributed locks.

---

## 5. Third-Party Platform Credentials & Webhooks

### A. Bluesky (AT Protocol)
- Users can connect their Bluesky accounts using their handle and an **App Password** created at `Settings > App Passwords` in the Bluesky client.
- App Passwords prevent exposing master account passwords and can be revoked at any time.
- All stored App Passwords and session tokens are encrypted at rest with AES-256-GCM.

### B. X (Twitter) API v2
- Create a project and app in the [X Developer Portal](https://developer.x.com).
- Set permissions to **Read and Write**.
- Configure User Authentication Settings (OAuth 2.0 with PKCE or API Key/Access Token pair).
- Set the callback URL: `https://app.postpilot.io/api/v1/social/x/callback`.

### C. Quora Manual Workflow
- In accordance with Quora's terms of service, AI draft answers are generated with target question URLs and verified content.
- Users can inspect and copy drafts in 1 click and track publication compliance manually.
- The adapter boundary (`src/lib/adapters/quora.ts`) is architected for automated publishing once an official, compliant publishing API becomes available.

### D. Razorpay Payments & Webhooks
1. **Webhook Endpoint Configuration**:
   - In Razorpay Dashboard, navigate to **Settings > Webhooks**.
   - Add endpoint: `https://app.postpilot.io/api/v1/webhooks/razorpay`
   - Secret: Must match `RAZORPAY_WEBHOOK_SECRET`.
   - Subscribed Events:
     - `order.paid`
     - `payment.captured`
     - `payment.failed`
2. **Signature Verification**:
   - Incoming payloads are verified using constant-time HMAC-SHA256 comparison (`crypto.timingSafeEqual`).
   - Webhook processing is idempotent: duplicate notifications with the same payment ID will not grant double credits.

---

## 6. Verification & Operational Health Checks

After deployment, verify the platform health:

1. **System Health & Diagnostics**:
   - Access the Admin Diagnostics panel at `/admin`.
   - Verify Redis connectivity, database connection, wallet invariants, and active worker count.
2. **Automated End-to-End Suite**:
   Run the master 16-point automated test suite:
   ```bash
   npx tsx scripts/verify-blueprint.ts
   ```
   Ensures:
   - Exactly-once 50 free credit grant on signup.
   - 2-phase commit atomic credit reservation and consumption.
   - Nonce and idempotency deduplication.
   - Tenant isolation across workspaces.
   - Character limit validations for Bluesky (300) and X (280).

---

## 7. Disaster Recovery & Backups

1. **MongoDB Atlas Continuous Backups**:
   - Enable Point-in-Time Restore (PITR) with 7-day retention.
2. **Financial Ledger Invariant**:
   - The `CreditLedgerEntry` collection is strictly append-only. Never run `delete` or `update` queries on ledger records. To correct an erroneous transaction, issue an `admin_adjustment` entry with full audit trail reason.
