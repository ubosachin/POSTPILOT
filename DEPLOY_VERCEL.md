# 🚀 Vercel Deployment Guide for PostPilot

PostPilot is fully configured for zero-friction serverless deployment on **Vercel** with full Next.js App Router support, Edge Middleware, and automated background job processing via **Vercel Cron**.

---

## 🏗️ How PostPilot Adapts to Vercel's Serverless Architecture

| Traditional VPS / Docker | Vercel Serverless Architecture |
| :--- | :--- |
| Long-running background daemon worker (`npm run worker`) | **Vercel Cron Jobs** pinging `/api/cron/process-jobs` automatically every minute |
| Standalone Node.js server (`node server.js`) | Native **Vercel Serverless & Edge Functions** with instant scaling |
| Constant MongoDB TCP connection | **Global connection pooling** via `global.mongooseCache` to prevent connection exhaustion |
| Manual reverse proxy & SSL (Nginx / Caddy) | Automatic global **Vercel Edge Network**, SSL certificates, and asset caching |

---

## 🛠️ Step 1: Deploy to Vercel

### Option A: Via GitHub (Recommended)
1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and select your GitHub repository.
3. Vercel will automatically detect **Next.js**.

### Option B: Via Vercel CLI
```bash
# 1. Install Vercel CLI globally (if not installed)
npm i -g vercel

# 2. Deploy to preview
vercel

# 3. Deploy to production
vercel --prod
```

---

## 🔑 Step 2: Configure Environment Variables in Vercel

In your Vercel Dashboard, navigate to:
**Project Settings → Environment Variables**

Add the following production environment variables:

| Variable | Description | Required | Example Value |
| :--- | :--- | :---: | :--- |
| `JWT_SECRET` | Secret key for signing session tokens (min 32 chars) | **Yes** | `7d8a9b0c1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f` |
| `ENCRYPTION_KEY` | 64-character hex key (32 bytes) for AES-256-GCM social vault | **Yes** | `e1f2a3b4c5d6e7f80123456789abcdef0123456789abcdef0123456789abcdef` |
| `MONGODB_URI` | MongoDB Atlas database connection string | **Yes** | `mongodb+srv://user:pass@cluster.mongodb.net/postpilot?retryWrites=true&w=majority` |
| `CRON_SECRET` | Secret bearer token used by Vercel Cron | **Yes** | `sec_cron_random_32_characters_key_here` |
| `NEXT_PUBLIC_APP_URL` | Public application URL (defaults to Vercel URL if unset) | Optional | `https://your-domain.com` or `https://postpilot.vercel.app` |
| `GEMINI_API_KEY` | Google Gemini AI API Key | Optional | `AIzaSy...` |
| `OPENAI_API_KEY` | OpenAI API Key for fallback AI generation | Optional | `sk-proj-...` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID for payments & credits | Optional | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret | Optional | `...` |
| `RAZORPAY_WEBHOOK_SECRET`| Razorpay Webhook Secret | Optional | `...` |

> 💡 **Tip:** In Vercel, when deploying preview branches, `VERCEL_URL` is automatically supplied by Vercel, and PostPilot automatically adapts `NEXT_PUBLIC_APP_URL` without manual editing.

---

## ⏰ Step 3: Automated Publishing with Vercel Cron

The [`vercel.json`](file:///Users/sachin/Desktop/PostPilot/vercel.json) file automatically registers the scheduled background worker:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/process-jobs",
      "schedule": "* * * * *"
    }
  ]
}
```

- When Vercel Cron triggers `/api/cron/process-jobs`, it sends `Authorization: Bearer <CRON_SECRET>`.
- The endpoint queries MongoDB Atlas for all due publishing jobs (`scheduledAt <= now`).
- Jobs are executed atomically, published to connected social networks (Bluesky, X), and results are persisted.
- **Immediate Posts** (`publishNow: true`) are published instantly on submission without waiting for the cron job.

---

## 🔍 Step 4: Verification After Deployment

Once deployment completes, verify your endpoints in the browser or via terminal:

1. **Liveness Check:**
   ```bash
   curl https://<your-project>.vercel.app/api/health
   # Expected: {"status":"ok","service":"postpilot","version":"1.0.0",...}
   ```
2. **Readiness & Database Check:**
   ```bash
   curl https://<your-project>.vercel.app/api/ready
   # Expected: {"ready":true,"status":"ready","subsystems":{"database":{"status":"healthy"},...}}
   ```
3. **Manual Cron Test:**
   ```bash
   curl -H "Authorization: Bearer <YOUR_CRON_SECRET>" https://<your-project>.vercel.app/api/cron/process-jobs
   # Expected: {"success":true,"processedCount":0,"jobs":[]}
   ```
4. **SEO Verification:**
   - `https://<your-project>.vercel.app/robots.txt`
   - `https://<your-project>.vercel.app/sitemap.xml`
