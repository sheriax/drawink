# Drawink Deployment Guide

Drawink uses a **3-service architecture** deployed across different platforms:

| Service | Platform | URL |
|---------|----------|-----|
| **Frontend** (React + Vite) | Vercel | `https://drawink.app` |
| **Collab Server** (Socket.io) | Google Cloud Run | `https://collab.drawink.app` |
| **Backend** (Database, Auth, Logic) | Convex Cloud | `https://clean-tapir-713.convex.cloud` |
| **File Storage** | Firebase Storage | (managed, no deploy needed) |

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Vercel     │────▶│  Google Cloud Run │     │  Convex Cloud  │
│  (Frontend)  │     │  (Collab Server)  │     │   (Backend)    │
│  drawink.app │     │ collab.drawink.app│     │   Real-time DB │
└──────┬───────┘     └──────────────────┘     └───────┬────────┘
       │                                               │
       │              ┌──────────────────┐             │
       └─────────────▶│ Firebase Storage │◀────────────┘
                      │   (File Uploads) │
                      └──────────────────┘
```

---

## Prerequisites

- **Node.js** 18+ and **Bun** installed
- **Vercel CLI**: `npm i -g vercel`
- **Convex CLI**: `npm i -g convex`
- **Google Cloud SDK**: `brew install --cask google-cloud-sdk`
- **Docker Desktop** installed and running
- Access to DNS settings for `drawink.app`

---

## 1. Convex Backend

Convex is deployed to Convex Cloud. No Docker or server management needed.

### First-Time Setup

```bash
# Login to Convex
npx convex login

# Create a production deployment (run from project root)
npx convex deploy
```

### Production URLs

| Type | URL |
|------|-----|
| **Cloud URL** (WebSocket / DB) | `https://clean-tapir-713.convex.cloud` |
| **Site URL** (HTTP actions) | `https://clean-tapir-713.convex.site` |

Use the **Cloud URL** as `VITE_CONVEX_URL` in Vercel.

### Configure Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → **JWT Templates**
2. Create a template named `convex`
3. Set the Issuer to your Clerk domain
4. In [Convex Dashboard](https://dashboard.convex.dev) → **Settings** → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `CLERK_JWT_ISSUER_DOMAIN` | `https://your-clerk-domain.clerk.accounts.dev` |

### Deploy Updates

```bash
# Deploy Convex functions and schema changes
npx convex deploy
```

### Useful Commands

```bash
# Open Convex dashboard
npx convex dashboard

# View logs
npx convex logs

# Run a function manually
npx convex run functionName '{"arg": "value"}'
```

### Environment Variables (Convex Dashboard)

Set these in [Convex Dashboard](https://dashboard.convex.dev) → **Settings** → **Environment Variables**:

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `CLERK_JWT_ISSUER_DOMAIN` | `https://your-clerk-domain.clerk.accounts.dev` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys → Issuer URL |

---

## 2. Collab Server (Google Cloud Run)

The Socket.io collaboration server handles real-time presence, cursor sync, and encrypted scene broadcasts.

### Project Configuration

| Setting | Value |
|---------|-------|
| **GCP Project** | `drawink-2026` |
| **Region** | `asia-south1` |
| **Service Name** | `drawink-collab` |
| **Domain** | `collab.drawink.app` |

### First-Time Setup

```bash
# Set GCP project
gcloud config set project drawink-2026

# Enable required APIs
gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  --project=drawink-2026

# Create Artifact Registry repo (if not exists)
gcloud artifacts repositories create drawink \
  --repository-format=docker \
  --location=asia-south1 \
  --description="Drawink Docker images" \
  --project=drawink-2026

# Configure Docker auth
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
```

### Deploy the Collab Server

```bash
# Navigate to server directory
cd server

# 1. Build Docker image (linux/amd64 required for Cloud Run)
docker build --platform linux/amd64 -t drawink-collab:latest .

# 2. Tag for Artifact Registry
docker tag drawink-collab:latest \
  asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink-collab:latest

# 3. Push to Artifact Registry
docker push \
  asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink-collab:latest

# 4. Deploy to Cloud Run
gcloud run deploy drawink-collab \
  --image=asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink-collab:latest \
  --region=asia-south1 \
  --port=3003 \
  --allow-unauthenticated \
  --cpu-throttling \
  --memory=256Mi \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=3600 \
  --session-affinity \
  --set-env-vars="NODE_ENV=production,PORT=3003,CORS_ORIGIN=https://drawink.app" \
  --project=drawink-2026
```

> **Note:** `--timeout=3600` (1 hour) is needed for long-lived WebSocket connections.
> `--session-affinity` ensures the same client hits the same instance for Socket.io.

### Environment Variables (Cloud Run)

Set via `--set-env-vars` in the deploy command, or in the Cloud Run console:

| Variable | Production Value | Purpose |
|----------|-----------------|---------|
| `PORT` | `3003` | Server listen port (must match `--port`) |
| `NODE_ENV` | `production` | Enables production optimizations |
| `CORS_ORIGIN` | `https://drawink.app` | Must match your frontend domain exactly |

### Custom Domain for Collab Server

Option A: Use the Cloud Run URL directly (e.g., `https://drawink-collab-xxxxx.asia-south1.run.app`).

Option B: Map a custom domain (`collab.drawink.app`):

```bash
# Reserve a static IP
gcloud compute addresses create drawink-collab-ip \
  --global --ip-version=IPV4 --project=drawink-2026

# Get the IP
gcloud compute addresses describe drawink-collab-ip \
  --global --project=drawink-2026 --format="value(address)"

# Create NEG
gcloud compute network-endpoint-groups create drawink-collab-neg \
  --region=asia-south1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=drawink-collab \
  --project=drawink-2026

# Create backend service
gcloud compute backend-services create drawink-collab-backend \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --project=drawink-2026

gcloud compute backend-services add-backend drawink-collab-backend \
  --global \
  --network-endpoint-group=drawink-collab-neg \
  --network-endpoint-group-region=asia-south1 \
  --project=drawink-2026

# URL map
gcloud compute url-maps create drawink-collab-urlmap \
  --default-service=drawink-collab-backend \
  --global --project=drawink-2026

# SSL certificate
gcloud compute ssl-certificates create drawink-collab-ssl \
  --domains=collab.drawink.app \
  --global --project=drawink-2026

# HTTPS proxy
gcloud compute target-https-proxies create drawink-collab-https-proxy \
  --ssl-certificates=drawink-collab-ssl \
  --url-map=drawink-collab-urlmap \
  --global --project=drawink-2026

# Forwarding rule
gcloud compute forwarding-rules create drawink-collab-https-rule \
  --global \
  --address=drawink-collab-ip \
  --target-https-proxy=drawink-collab-https-proxy \
  --ports=443 \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --project=drawink-2026
```

Then add a DNS A record:

| Name | Type | Value |
|------|------|-------|
| `collab` | A | `<static-ip-from-above>` |

### Quick Redeploy (Server Updates)

```bash
cd server
docker build --platform linux/amd64 -t drawink-collab:latest . && \
docker tag drawink-collab:latest asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink-collab:latest && \
docker push asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink-collab:latest && \
gcloud run deploy drawink-collab \
  --image=asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink-collab:latest \
  --region=asia-south1 \
  --project=drawink-2026
```

---

## 3. Frontend (Vercel)

The frontend is a static Vite build deployed to Vercel.

### First-Time Setup

```bash
# Login to Vercel
vercel login

# Link project (run from project root)
vercel link
```

When prompted:
- **Project name:** `drawink`
- **Framework:** Vite
- **Build command:** `bun run build`
- **Output directory:** `dist`
- **Install command:** `bun install`

### Environment Variables (Vercel Dashboard)

Go to [Vercel Dashboard](https://vercel.com) → **drawink** → **Settings** → **Environment Variables**.

**Required:**

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `VITE_CONVEX_URL` | `https://clean-tapir-713.convex.cloud` | [Convex Dashboard](https://dashboard.convex.dev) → Settings → URL |
| `VITE_APP_FIREBASE_CONFIG` | `{"apiKey":"...","projectId":"...","storageBucket":"..."}` | Firebase Console → Project Settings → Web app config |
| `VITE_APP_WS_SERVER_URL` | `https://collab.drawink.app` (or Cloud Run URL) | Your deployed collab server URL |

**Recommended for production:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_APP_ENABLE_TRACKING` | `true` | Enable analytics |
| `VITE_APP_DISABLE_PREVENT_UNLOAD` | `false` | Show "unsaved changes" warning |
| `VITE_APP_DISABLE_PWA` | `false` | Enable service worker / PWA |
| `VITE_APP_DISABLE_SENTRY` | `false` | Enable Sentry error tracking |
| `VITE_APP_GIT_SHA` | _(leave empty)_ | Vercel auto-provides `VERCEL_GIT_COMMIT_SHA` |

**Optional (set only if you use these features):**

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_SENTRY_DSN` | `https://...@sentry.io/...` | Error tracking |
| `VITE_APP_AI_BACKEND` | `https://your-ai-api.com` | AI diagram-to-code / text-to-diagram |
| `VITE_APP_LIBRARY_URL` | `https://libraries.excalidraw.com` | Excalidraw community library |
| `VITE_APP_LIBRARY_BACKEND` | `https://us-central1-excalidraw-room-persistence.cloudfunctions.net/libraries` | Library submission API |
| `VITE_APP_PLUS_APP` | URL | Drawink Plus integration |
| `VITE_APP_PLUS_LP` | URL | Drawink Plus landing page |
| `VITE_APP_PLUS_EXPORT_PUBLIC_KEY` | key | Plus export encryption |

**Legacy (remove after Convex migration is complete):**

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `https://...` | Old tRPC API |
| `VITE_APP_BACKEND_V2_GET_URL` | `https://.../api/v2/` | Old JSON backend GET |
| `VITE_APP_BACKEND_V2_POST_URL` | `https://.../api/v2/post` | Old JSON backend POST |

### Custom Domain

In Vercel Dashboard → **drawink** → **Settings** → **Domains**:
1. Add `drawink.app`
2. Follow Vercel's DNS instructions (add A/CNAME records at your registrar)

### Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

Or simply push to your main branch — Vercel auto-deploys on git push if connected to your repo.

### Update `vercel.json`

The existing `vercel.json` needs updating for the new architecture:

```json
{
  "public": true,
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "installCommand": "bun install",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "origin" }
      ]
    },
    {
      "source": "/:file*.woff2",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The `rewrites` rule ensures client-side routing works (SPA fallback).

---

## 4. Firebase Storage

Firebase Storage is used only for file uploads (images, sketches). No deployment step is needed — it's a managed service.

### Setup (One-Time)

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Enable **Storage**
3. Set security rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

4. Copy the config values into your `VITE_APP_FIREBASE_CONFIG` env var

---

## Full Deployment Checklist

When deploying everything from scratch:

- [ ] **Convex**: `npx convex deploy` — deploy backend functions and schema
- [ ] **Convex**: Set `CLERK_JWT_ISSUER_DOMAIN` env var in Convex Dashboard
- [ ] **Cloud Run**: Build, push, and deploy the collab server Docker image
- [ ] **Cloud Run**: Set env vars (`CORS_ORIGIN`, `NODE_ENV`, `PORT`)
- [ ] **Cloud Run**: (Optional) Set up custom domain `collab.drawink.app`
- [ ] **Vercel**: Set all `VITE_*` env vars in Vercel Dashboard
- [ ] **Vercel**: Deploy with `vercel --prod` or git push
- [ ] **Vercel**: Configure custom domain `drawink.app`
- [ ] **Firebase**: Verify Storage rules are set
- [ ] **DNS**: A records pointing to Vercel and Cloud Run IPs
- [ ] **Test**: Verify app loads, auth works, collab works, files upload

---

## Monitoring & Troubleshooting

### Vercel

```bash
# View deployment logs
vercel logs drawink.app

# List deployments
vercel ls
```

Or use the [Vercel Dashboard](https://vercel.com) for logs, analytics, and deployment history.

### Cloud Run (Collab Server)

```bash
# View logs
gcloud run services logs read drawink-collab \
  --region=asia-south1 --project=drawink-2026 --limit=50

# Check service status
gcloud run services describe drawink-collab \
  --region=asia-south1 --project=drawink-2026
```

### Convex

```bash
# View logs
npx convex logs

# Open dashboard
npx convex dashboard
```

### DNS Verification

```bash
# Check frontend
dig drawink.app A +short

# Check collab server
dig collab.drawink.app A +short
```

### Common Issues

| Issue | Solution |
|-------|----------|
| WebSocket disconnects | Ensure Cloud Run `--timeout=3600` and `--session-affinity` are set |
| CORS errors | Verify `CORS_ORIGIN` on Cloud Run matches frontend domain exactly |
| Auth fails | Check Clerk JWT template is named `convex`, issuer URL is correct |
| Files won't upload | Check Firebase Storage rules allow authenticated writes |
| Convex errors | Run `npx convex logs` to see server-side errors |
| Blank page on Vercel | Ensure `rewrites` in `vercel.json` has SPA fallback |

---

## Cost Overview

| Service | Expected Cost |
|---------|--------------|
| **Vercel** (Hobby) | Free (100GB bandwidth/month) |
| **Vercel** (Pro) | $20/month (1TB bandwidth) |
| **Cloud Run** | ~$0-5/month (with CPU throttling, min 0 instances) |
| **Convex** | Free tier (then $25/month for Pro) |
| **Firebase Storage** | ~$0.026/GB stored + $0.12/GB downloaded |
| **Clerk** | Free up to 10k MAU |

---

## Console Links

| Resource | URL |
|----------|-----|
| Vercel Dashboard | [vercel.com/dashboard](https://vercel.com/dashboard) |
| Convex Dashboard | [dashboard.convex.dev](https://dashboard.convex.dev) |
| Cloud Run | [console.cloud.google.com/run?project=drawink-2026](https://console.cloud.google.com/run?project=drawink-2026) |
| Artifact Registry | [console.cloud.google.com/artifacts?project=drawink-2026](https://console.cloud.google.com/artifacts?project=drawink-2026) |
| Firebase Console | [console.firebase.google.com](https://console.firebase.google.com) |
| Clerk Dashboard | [dashboard.clerk.com](https://dashboard.clerk.com) |
