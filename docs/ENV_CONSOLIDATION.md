# Environment Variables Consolidation

**Date**: 2026-01-26
**Status**: ✅ Completed

## Summary

All environment variables have been consolidated from sub-app directories into the root level of the project. This eliminates duplication, reduces confusion, and provides a single source of truth for configuration.

## What Changed

### Files Created
- ✅ `.env.example` - Comprehensive template with all variables and documentation
- ✅ `.env.local` - Actual secrets and API keys (gitignored)
- ✅ `.env.README.md` - Complete documentation for environment setup

### Files Removed
- ❌ `apps/web/.env.local` - Consolidated into root `.env.local`
- ❌ `apps/web/.env.example` - Consolidated into root `.env.example`
- ❌ `apps/api/.env.example` - Consolidated into root `.env.example`
- ❌ `apps/docs/.env` - Was empty, removed

### Simplified Approach
Instead of maintaining multiple environment files (`.env.development`, `.env.production`), we use a single `.env.local` file for simplicity. Change values as needed for development vs production.

## Variables Consolidated

### Authentication (Clerk)
```bash
# Frontend (public)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_bG95YWwtdmVydmV0LTMuY2xlcmsuYWNjb3VudHMuZGV2JA

# Backend (secret)
CLERK_SECRET_KEY=sk_test_WMujHekwMyocMxhLZ31huGdiVYfFmQYx9iPIFxCDtZ
```

### Firebase Configuration
```bash
# Frontend (public - JSON format)
VITE_APP_FIREBASE_CONFIG='{
  "apiKey": "AIzaSyCAUHzaqdecV3dGtNOTdO6jFich5K4mZOc",
  "authDomain": "drawink-2026.firebaseapp.com",
  "projectId": "drawink-2026",
  "storageBucket": "drawink-2026.firebasestorage.app",
  "messagingSenderId": "731425062456",
  "appId": "1:731425062456:web:2994221d82e8eb01c9f0cd"
}'

# Backend (Admin SDK)
FIREBASE_PROJECT_ID=drawink-2026
FIREBASE_CLIENT_EMAIL=(needs to be added)
FIREBASE_PRIVATE_KEY=(needs to be added)
```

### Stripe Billing (Phase 4)
```bash
# Backend secrets
STRIPE_SECRET_KEY=sk_test_51NUhU9JsSFUyRsdk18tFgr3EnUO60JCWB9tYS5kcQ0KJdtnW7ay1Ybr8VXL4CmFh6KMohHazcfuuc63C4dQRCa7I00sQq5jmSp
STRIPE_PUBLISHABLE_KEY=pk_test_51NUhU9JsSFUyRsdksrbpIuRMEFhzPPqHlqQ2hH3TSM5IU7MFRzfw7HCnpmt5mwHrPuLC51nQmnYUP3OmLCfZuBGI006fCGnbpM
STRIPE_WEBHOOK_SECRET=whsec_ZZqgclY50FsDgOGjP8qu2HvlEexmInWo

# Product price IDs
STRIPE_PRICE_ID_PRO=price_1StoGYJsSFUyRsdkI4oG2XJA
STRIPE_PRICE_ID_TEAM=price_1StoGvJsSFUyRsdkGMQryIHv
```

### API Configuration
```bash
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3003
VITE_APP_BACKEND_V2_GET_URL=http://localhost:3001/api/v2/
VITE_APP_BACKEND_V2_POST_URL=http://localhost:3001/api/v2/post
VITE_APP_WS_SERVER_URL=http://localhost:3003
VITE_APP_AI_BACKEND=http://localhost:3015
```

### App Configuration
```bash
PORT=3001
JSON_BACKEND_PORT=3001
NODE_ENV=development
VITE_APP_GIT_SHA=development
VITE_APP_PORT=3000
VITE_APP_DISABLE_PWA=true
VITE_APP_DISABLE_PREVENT_UNLOAD=true
VITE_APP_ENABLE_TRACKING=true
```

## How It Works

### Vite Environment Loading

Vite automatically loads environment variables from the root directory:

1. Checks for `.env.local` (your secrets)
2. Checks for `.env.development` or `.env.production` (environment-specific)
3. Checks for `.env` (base configuration)

All `VITE_*` prefixed variables are exposed to the browser bundle.

### Node.js Environment Loading

The backend API loads environment variables using `dotenv`:

```typescript
// Automatically loads from root .env files
import 'dotenv/config';

// All variables available via process.env
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
```

## Developer Workflow

### New Developer Setup
1. Clone repository
2. Run `cp .env.example .env.local`
3. Fill in actual API keys in `.env.local`
4. Run `bun install`
5. Run `bun run dev`

### Existing Developers
Your `.env.local` has been created with all existing values. No action needed unless you want to update specific keys.

## Security

### ✅ Safe (Tracked in Git)
- `.env.example` - Template with placeholders
- `.env.development` - Dev config, no secrets
- `.env.production` - Prod config, no secrets
- `.env.README.md` - Documentation

### 🔐 Secret (Gitignored)
- `.env.local` - Contains actual API keys and secrets
- `.env.development.local` - Dev-specific secrets (if needed)
- `.env.production.local` - Prod-specific secrets (if needed)

## Benefits

### Before (Scattered)
```
drawink/
├── .env.development
├── .env.production
├── apps/web/.env.local
├── apps/web/.env.example
├── apps/api/.env.example
└── apps/docs/.env
```
❌ Duplication across files
❌ Easy to have mismatched values
❌ Confusion about which file to edit
❌ Hard to track what variables exist

### After (Centralized & Simplified)
```
drawink/
├── .env.example           # Template with all documentation
└── .env.local             # Your actual values (all-in-one)
```
✅ Single source of truth
✅ No duplication between dev/prod files
✅ Easy to find and update variables
✅ Maximum simplicity (just 2 files!)
✅ Well-documented with `.env.README.md`

## Next Steps

### 1. Complete Stripe Setup
Now that environment variables are centralized, you can proceed with Stripe setup:

```bash
# 1. Sign up for Stripe (if not already)
open https://dashboard.stripe.com

# 2. Create products
# - Pro: ₹249/month
# - Team: ₹999/month

# 3. Copy price IDs to .env.local
# STRIPE_PRICE_ID_PRO=price_...
# STRIPE_PRICE_ID_TEAM=price_...

# 4. Set up webhook endpoint
# - URL: https://api.drawink.app/webhooks/stripe
# - Events: checkout.session.completed, customer.subscription.*
# - Copy webhook secret to STRIPE_WEBHOOK_SECRET

# 5. Test locally with Stripe CLI
stripe listen --forward-to localhost:3001/webhooks/stripe
```

### 2. Complete Firebase Admin SDK Setup
Add Firebase Admin SDK credentials to `.env.local`:

```bash
# Get from: Firebase Console > Project Settings > Service Accounts
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@drawink-2026.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Test All Services
```bash
# Start all services
bun run dev

# Test each integration:
# - Clerk authentication
# - Firebase Firestore
# - Stripe checkout
# - WebSocket collaboration
```

## Rollback Instructions

If you need to rollback for any reason:

```bash
# Restore deleted files from git history
git checkout HEAD~1 -- apps/web/.env.local
git checkout HEAD~1 -- apps/web/.env.example
git checkout HEAD~1 -- apps/api/.env.example

# Remove new files
rm .env.example .env.local .env.README.md
```

## References

- [Environment Setup Documentation](./.env.README.md)
- [Phase 4 Completion](./migration/PHASE_4_COMPLETION.md)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js dotenv](https://github.com/motdotla/dotenv)

## Verification Checklist

- [x] All values from sub-app env files preserved
- [x] .env.local properly gitignored
- [x] .env.example created with comprehensive documentation
- [x] .env.README.md created with setup instructions
- [x] Sub-app env files removed
- [x] No values lost during consolidation
- [x] Git status shows only expected changes
- [x] Ready for Stripe setup

## Questions?

See [.env.README.md](./.env.README.md) for detailed documentation or reach out to the team.
