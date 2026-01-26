# Drawink Deployment Guide

This guide covers deploying Drawink - a simplified single-app architecture.

## Architecture Overview

Drawink is now a **single Vite + React application** with:
- Frontend: React 19 + TypeScript
- Backend: Convex (serverless)
- Real-time: Convex subscriptions
- Authentication: Clerk
- No Docker required
- No monorepo complexity

## Quick Start

### Development

```bash
# Install dependencies
bun install

# Start development server (runs both Convex and Vite)
bun dev

# Or run separately
bun dev:convex  # Convex backend
bun dev:vite    # Vite frontend
```

### Build

```bash
# Build for production
bun build

# Preview production build locally
bun preview
```

## Deployment Options

### Option 1: Vercel (Recommended)

**Why Vercel?**
- Zero configuration for Vite apps
- Automatic deployments from Git
- Edge network (fast globally)
- Free SSL certificates
- Generous free tier

**Setup:**

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login:**
```bash
vercel login
```

3. **Deploy:**
```bash
vercel
```

4. **Production deployment:**
```bash
vercel --prod
```

**Automatic deployments:**
- Connect your repository on [vercel.com](https://vercel.com)
- Every push to `main` auto-deploys to production
- Pull requests get preview URLs

### Option 2: Netlify

**Setup:**

1. **Install Netlify CLI:**
```bash
npm i -g netlify-cli
```

2. **Login:**
```bash
netlify login
```

3. **Deploy:**
```bash
netlify deploy --prod
```

**Or use Netlify's web interface:**
- Import project from GitHub
- Build command: `bun build`
- Publish directory: `dist`

### Option 3: Firebase Hosting

**Setup:**

1. **Install Firebase CLI:**
```bash
npm i -g firebase-tools
```

2. **Login:**
```bash
firebase login
```

3. **Initialize (if not already done):**
```bash
firebase init hosting
```

4. **Build and deploy:**
```bash
bun build
firebase deploy --only hosting
```

### Option 4: Cloudflare Pages

**Setup:**

1. **Build:**
```bash
bun build
```

2. **Deploy via web interface:**
- Go to [Cloudflare Pages](https://pages.cloudflare.com/)
- Connect your Git repository
- Build command: `bun build`
- Output directory: `dist`

## Environment Variables

### Required Environment Variables

Create `.env.local` (never commit this file):

```bash
# Convex
VITE_CONVEX_URL=https://your-project.convex.cloud

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Optional: Sentry
VITE_SENTRY_DSN=https://...

# Optional: Firebase (if using Firebase features)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

### Setting Environment Variables on Platforms

**Vercel:**
- Dashboard → Settings → Environment Variables
- Add each variable

**Netlify:**
- Site settings → Build & deploy → Environment
- Add each variable

**Firebase:**
- Use `.env.production` file (gitignored)
- Or Firebase config

**Cloudflare Pages:**
- Settings → Environment variables
- Add each variable

## Convex Backend Deployment

Convex is deployed separately from your frontend.

### Deploy Convex Functions

```bash
# Deploy to production
bunx convex deploy --prod

# Or use npm script
bun convex:deploy
```

### Convex Dashboard

```bash
# Open Convex dashboard
bun convex:dashboard
```

**Convex URL:**
Your `VITE_CONVEX_URL` will be provided after initial deployment. Copy it to your environment variables on your hosting platform.

## Custom Domain Setup

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS with provided records
4. SSL automatically provisioned

### Netlify
1. Go to Domain settings
2. Add custom domain
3. Update DNS
4. SSL automatically provisioned

### Firebase Hosting
1. Go to Firebase Console → Hosting
2. Add custom domain
3. Follow DNS setup instructions
4. SSL automatically provisioned

### Cloudflare Pages
1. Go to Custom domains
2. Add domain
3. Update DNS (instant if domain is on Cloudflare)
4. SSL automatically provisioned

## Cost Estimation

### Free Tier Deployments

| Platform | Free Tier | Best For |
|----------|-----------|----------|
| **Vercel** | 100 GB bandwidth, Unlimited bandwidth for non-commercial | Personal/small projects |
| **Netlify** | 100 GB bandwidth, 300 build minutes | Small projects |
| **Firebase** | 10 GB storage, 360 MB/day transfer | Firebase users |
| **Cloudflare Pages** | Unlimited bandwidth, 500 builds/month | Any size |
| **Convex** | Generous free tier | Real-time apps |

**Recommended for this project:** Vercel + Convex (both have generous free tiers)

**Expected Monthly Cost:** ₹0 (free tier sufficient for low-medium traffic)

## Monitoring & Troubleshooting

### Check Build Logs

**Vercel:**
```bash
vercel logs
```

**Netlify:**
```bash
netlify logs
```

**Firebase:**
```bash
firebase hosting:channel:list
```

### Check Deployment Status

**Vercel:**
```bash
vercel ls
```

**Convex:**
```bash
bunx convex dashboard
```

### Common Issues

**1. Build fails:**
- Check Node.js version (>=18.0.0)
- Clear cache: `rm -rf node_modules dist && bun install`
- Check environment variables

**2. Convex connection fails:**
- Verify `VITE_CONVEX_URL` is set correctly
- Check Convex deployment status: `bun convex:dashboard`
- Ensure Convex functions are deployed: `bun convex:deploy`

**3. Authentication fails:**
- Verify `VITE_CLERK_PUBLISHABLE_KEY` is set
- Check Clerk dashboard for configuration
- Ensure allowed domains are configured in Clerk

## CI/CD

### GitHub Actions (Vercel)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Build
        run: bun build
        env:
          VITE_CONVEX_URL: ${{ secrets.VITE_CONVEX_URL }}
          VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## URLs

| Environment | URL |
|-------------|-----|
| **Development** | http://localhost:5173 |
| **Production** | Your custom domain or platform URL |
| **Convex Dashboard** | https://dashboard.convex.dev |

## Simplified Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Internet/Users                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  CDN/Edge Network                           │
│            (Vercel/Netlify/Cloudflare)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              React Frontend (Static)                        │
│                                                             │
│  - Vite Build Output                                        │
│  - React 19 + TypeScript                                    │
│  - Client-side routing                                      │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
             ▼                           ▼
┌────────────────────────┐    ┌─────────────────────┐
│   Convex Backend       │    │  Clerk Auth         │
│   (Serverless)         │    │  (Authentication)   │
│                        │    │                     │
│  - Database            │    │  - User Management  │
│  - Real-time sync      │    │  - SSO              │
│  - Functions           │    │  - Session tokens   │
└────────────────────────┘    └─────────────────────┘
```

## Notes

- **No Docker needed** - Direct deployment of static files
- **No backend server required** - Convex handles all backend needs
- **Automatic scaling** - CDN and serverless scale automatically
- **Zero configuration** - Vite + modern hosting platforms work seamlessly
- **Fast global delivery** - Edge networks serve static assets
- **Free SSL** - All platforms provide automatic HTTPS

---

## Migration from Docker/Monorepo

If you're coming from the old Docker/monorepo setup:

1. **Removed:**
   - ❌ Docker containers
   - ❌ Nginx configuration
   - ❌ Supervisor
   - ❌ Multiple apps (api, web, ws)
   - ❌ Manual server management

2. **Replaced with:**
   - ✅ Single Vite app
   - ✅ Convex for backend
   - ✅ Clerk for authentication
   - ✅ CDN deployment
   - ✅ Serverless architecture

3. **Benefits:**
   - Simpler deployment
   - Lower costs (free tier friendly)
   - Better performance (edge network)
   - Easier maintenance
   - Automatic scaling
