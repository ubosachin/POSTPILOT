# PostPilot — AI Social Publisher SaaS

PostPilot is an enterprise multi-tenant SaaS that empowers subscribers to enter topics, generate platform-specific content with AI, review and edit drafts, and schedule publication to **Bluesky (AT Protocol)** and **X (API v2)**, paired with a dedicated compliant **Quora Answer Studio**.

---

## 🚀 Key Highlights & Critical Product Decisions

1. **Working Vertical Slice Completed**:
   - `Sign in` → `Enter Topic` → `Generate Platform Variants` → `Approve` → `Instant Publish to Bluesky` (with confirmed URI, CID, and web post URL).
2. **Compliant Multi-Platform Architecture**:
   - **Bluesky**: Official AT Protocol SDK (`@atproto/api`) with session authentication, 300-character limit guardrails, and post record creation.
   - **X (Twitter)**: API v2 adapter with OAuth 1.0a / OAuth 2.0, 280-character limit guardrails, and unit-economic quota protection.
   - **Quora**: Distinct compliant workflow (draft answers, question URLs, one-click copy, and manual publication confirmation) ensuring business model resilience without reliance on unverified APIs.
3. **Multi-Tenant Isolation**:
   - Every document and query is strictly scoped by `workspaceId`.
   - Role-Based Access Control (`owner`, `admin`, `editor`, `viewer`).
4. **Resilient Publishing Queue & Worker**:
   - Durable `publishingJobs` state machine: `draft` → `approved` → `scheduled` → `publishing` → `published` (with `retry_wait`, `failed`, `cancelled`, `needs_reauthorization`).
   - Atomic job locking to prevent double delivery.
   - Idempotency key uniqueness (`job_{variantId}_{socialAccountId}`).
   - Standalone worker daemon (`npm run worker`) runnable independently from Vercel / Next.js.
5. **Security & Cryptography**:
   - Social credentials encrypted with **AES-256-GCM** authenticated cipher.
   - Webhook signatures verified with HMAC-SHA256 (`crypto.timingSafeEqual`).
6. **Per-Subscriber Quotas & Razorpay Billing**:
   - Starter (₹499), Pro (₹1,499), Agency (₹3,999) with hard usage limits to safeguard against runaway API fees.

---

## 🛠️ Tech Stack

- **Frontend & App Router**: Next.js 15, React 19, Vanilla CSS Design System with Glassmorphism, Lucide Icons.
- **Backend API**: Node.js, Next.js Route Handlers.
- **Database**: MongoDB with Mongoose (with built-in resilient in-memory fallback for local dev).
- **Social Protocols**: Official `@atproto/api` for Bluesky, X API v2.
- **Job Queues**: BullMQ + Redis + standalone worker runner.
- **Billing**: Razorpay subscription models and webhook handler.

---

## 📁 Repository Structure

```
PostPilot/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/generate/route.ts      # AI multi-platform generation endpoint
│   │   │   ├── audit-logs/route.ts       # Tenant audit logs endpoint
│   │   │   ├── auth/me/route.ts          # Authenticated session profile
│   │   │   ├── auth/login/route.ts       # Login & JWT token issuance
│   │   │   ├── billing/route.ts          # Subscriptions & quota limits
│   │   │   ├── billing/webhook/route.ts  # Verified Razorpay webhook handler
│   │   │   ├── jobs/route.ts             # Publishing jobs & queue listing
│   │   │   ├── jobs/[id]/retry/route.ts  # Manual job retry endpoint
│   │   │   ├── posts/route.ts            # Content items & variants listing
│   │   │   ├── posts/[id]/route.ts       # Variant edit / approval / delete
│   │   │   ├── publish/route.ts          # Immediate publish or schedule
│   │   │   ├── social-accounts/route.ts  # Encrypted social account management
│   │   │   └── social-accounts/test/route.ts # Social connection verification
│   │   ├── admin/page.tsx                # Tenant audit trail & system diagnostics
│   │   ├── billing/page.tsx              # Pricing plans & quota gauges
│   │   ├── calendar/page.tsx             # Publishing queue & schedule timeline
│   │   ├── posts/page.tsx                # Content library
│   │   ├── quora/page.tsx                # Compliant Quora Answer Workspace
│   │   ├── social-accounts/page.tsx      # Social connections & health status
│   │   ├── globals.css                   # Obsidian glassmorphic design system
│   │   ├── layout.tsx                    # Root layout with fonts & metadata
│   │   └── page.tsx                      # AI Studio & Flagship Vertical Slice
│   ├── components/
│   │   └── DashboardLayout.tsx           # Sidebar navigation & workspace selector
│   ├── lib/
│   │   ├── adapters/
│   │   │   ├── bluesky.ts                # Official Bluesky AT Protocol adapter
│   │   │   ├── x.ts                      # X API v2 adapter with OAuth 1.0a
│   │   │   └── quora.ts                  # Quora workflow helpers
│   │   ├── ai/
│   │   │   └── generator.ts              # Multi-platform content generator
│   │   ├── db/
│   │   │   ├── index.ts                  # Mongoose connector with fallback
│   │   │   └── memoryStore.ts            # Resilient multi-tenant local store
│   │   ├── models/
│   │   │   └── index.ts                  # Mongoose schemas & blueprint indexes
│   │   ├── queue/
│   │   │   └── publisherQueue.ts         # Atomic job execution & queue runner
│   │   ├── auth.ts                       # JWT tenancy context extraction
│   │   └── crypto.ts                     # AES-256-GCM encryption utility
│   ├── types/
│   │   └── index.ts                      # Domain TypeScript interfaces
│   └── workers/
│       └── publisherWorker.ts            # Standalone background worker daemon
├── scripts/
│   └── verify-blueprint.ts               # Automated 14-point blueprint test suite
├── .env.example
├── .env.local
├── package.json
└── tsconfig.json
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run the Automated Blueprint Verification Suite
```bash
npx tsx scripts/verify-blueprint.ts
```
*Expected: 14/14 tests pass (tenant isolation, AES-256-GCM encryption, character guardrails, Bluesky adapter, X adapter, job deduplication, quota limits, and webhook HMAC validation).*

### 4. Start Next.js Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

### 5. (Optional) Run the Standalone Background Worker
To execute scheduled publishing jobs independently in the background:
```bash
npm run worker
```

---

## 🧪 Testing the First Vertical Slice

1. Open `http://localhost:3000`.
2. Notice the authenticated workspace: **PostPilot Growth Lab (Pro Plan)**.
3. Select or enter a topic (e.g., *"Decoupling background publishing workers in Next.js"*).
4. Click **Generate Drafts** — watch as the AI Studio creates platform-specific variations for **Bluesky** (`< 300 chars`), **X** (`< 280 chars`), and **Quora** (`in-depth answer format`).
5. Click **Publish to Bluesky Now** on the Bluesky card.
6. The green notification confirms delivery with real `CID`, `URI`, and clickable post link!
7. Check the **Queue & Calendar** page to see confirmed delivery records or scheduled jobs.
8. Check **Quora Workspace** for 1-click answer copy and manual verification tracking.
9. Visit **Billing & Quotas** to view real-time per-subscriber meter gauges.
