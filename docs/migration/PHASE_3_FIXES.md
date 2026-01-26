# Phase 3 - White Screen Fix

**Date:** 2026-01-26
**Status:** ✅ FIXED

---

## Issues Encountered

### 1. White Screen on App Load

**Error:**
```
FirebaseError: Firebase: No Firebase App '[DEFAULT]' has been created - call initializeApp() first (app/no-app).
    at getApp (chunk-D4ELFZFP.js?v=d80d4601:1816:25)
    at getFirestore (firebase_firestore.js?v=d80d4601:16509:40)
    at new CloudStorageAdapter (CloudStorageAdapter.ts:129:22)
```

**Root Cause:**
- `apps/web/.env.local` was using individual Firebase variables (VITE_FIREBASE_API_KEY, etc.)
- The codebase expects `VITE_APP_FIREBASE_CONFIG` as a JSON string
- Firebase initialization in `firebase.ts` was failing silently with empty config

### 2. API Connection Refused

**Error:**
```
GET http://localhost:3001/trpc/organization.myOrganizations net::ERR_CONNECTION_REFUSED
```

**Root Cause:**
- API server (`apps/api`) was not running
- The app expects tRPC API on port 3001

---

## Fixes Applied

### 1. Fixed Firebase Configuration

**File:** `apps/web/.env.local`

**Before:**
```bash
# Individual variables (NOT USED by codebase)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**After:**
```bash
# JSON string format (CORRECT)
VITE_APP_FIREBASE_CONFIG='{
  "apiKey": "AIzaSyCAUHzaqdecV3dGtNOTdO6jFich5K4mZOc",
  "authDomain": "drawink-2026.firebaseapp.com",
  "projectId": "drawink-2026",
  "storageBucket": "drawink-2026.firebasestorage.app",
  "messagingSenderId": "731425062456",
  "appId": "1:731425062456:web:2994221d82e8eb01c9f0cd"
}'
```

**Why This Works:**
- `apps/web/src/data/firebase.ts` parses `VITE_APP_FIREBASE_CONFIG` as JSON (line 41)
- If parsing fails, it sets empty config `{}`, causing Firebase to not initialize
- CloudStorageAdapter then tries to call `getFirestore()` without initialized app → error

### 2. Updated Development Guide

**File:** `DEVELOPMENT.md`

**Added:**
- Phase 3 monorepo architecture documentation
- Turborepo command reference
- Environment variable structure for monorepo apps
- tRPC API endpoints documentation
- Comprehensive troubleshooting section for Phase 3 issues

---

## How to Use the Fixes

### Step 1: Update Your Environment File

If you haven't already, ensure `apps/web/.env.local` contains:

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_bG95YWwtdmVydmV0LTMuY2xlcmsuYWNjb3VudHMuZGV2JA

# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3003

# Firebase Configuration (JSON format - REQUIRED)
VITE_APP_FIREBASE_CONFIG='{
  "apiKey": "AIzaSyCAUHzaqdecV3dGtNOTdO6jFich5K4mZOc",
  "authDomain": "drawink-2026.firebaseapp.com",
  "projectId": "drawink-2026",
  "storageBucket": "drawink-2026.firebasestorage.app",
  "messagingSenderId": "731425062456",
  "appId": "1:731425062456:web:2994221d82e8eb01c9f0cd"
}'

# App Configuration
VITE_APP_GIT_SHA=development
VITE_APP_DISABLE_PWA=false
VITE_APP_DISABLE_PREVENT_UNLOAD=true
VITE_APP_PLUS_LP=https://plus.drawink.app
VITE_APP_PLUS_APP=http://localhost:3000
VITE_APP_ENABLE_TRACKING=true
```

### Step 2: Start All Services

**Option A: Start everything** (recommended):
```bash
bun run dev
```

This starts:
- Web app (port 3000)
- API server (port 3001)
- WebSocket server (port 3003)

**Option B: Start services separately**:

Terminal 1 (Web App):
```bash
bun run dev --filter=@drawink/web
```

Terminal 2 (API Server):
```bash
bun run dev --filter=@drawink/api
```

Terminal 3 (WebSocket Server - optional):
```bash
bun run dev --filter=@drawink/ws
```

### Step 3: Verify Everything Works

1. **Open app:** http://localhost:3000
2. **Check console:** No Firebase errors
3. **Sign in:** Use Clerk authentication
4. **Test Organization Selector:** Top-right dropdown should load organizations
5. **Test Dashboard:** Navigate to /dashboard
6. **Test Projects Sidebar:** Click folder icon in sidebar

---

## Understanding the Root Environment Files

The project has two environment files at the root:

### .env.development (for development)
- Used when running `bun run dev`
- Contains development URLs (localhost)
- Has Firebase config as JSON string
- Includes Clerk publishable key

### .env.production (for production builds)
- Used when building for production
- Contains production URLs
- Same Firebase config (development project)
- Same Clerk key (test environment)

### Turborepo Global Dependencies

In `turbo.json`:
```json
{
  "globalDependencies": [".env"]
}
```

This means root `.env` files are loaded for all packages. However, individual apps can override with their own `.env.local` files.

---

## Environment Variable Resolution Order

Vite loads environment variables in this order (last one wins):

1. Root `.env` (committed to git)
2. Root `.env.development` or `.env.production` (committed)
3. Package-specific `.env.local` (NOT committed, highest priority)

**For apps/web**:
1. Root `.env.development` provides base config
2. `apps/web/.env.local` can override (e.g., for Clerk keys)

---

## API Server Configuration

The API server (`apps/api`) also needs environment variables:

**File:** `apps/api/.env.local` (create if not exists)

```bash
# Clerk Secret Key (for JWT verification)
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Firebase Admin SDK (JSON format)
FIREBASE_ADMIN_SDK={"projectId":"drawink-2026","privateKey":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","clientEmail":"firebase-adminsdk-...@drawink-2026.iam.gserviceaccount.com"}

# Server Port (optional, defaults to 3001)
PORT=3001
```

**Note:** You'll need actual Clerk and Firebase credentials for the API to work fully.

---

## Troubleshooting

### Still Getting White Screen?

1. **Check Firebase config format:**
   ```bash
   # View your config
   cat apps/web/.env.local | grep VITE_APP_FIREBASE_CONFIG

   # Should be JSON string, not individual variables
   ```

2. **Restart dev server:**
   ```bash
   # Stop with Ctrl+C
   bun run dev --filter=@drawink/web
   ```

3. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click refresh → "Empty Cache and Hard Reload"

### API Still Not Working?

1. **Check if API server is running:**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok"}
   ```

2. **Check API logs** in the terminal where you ran `bun run dev`

3. **Verify Clerk keys match:**
   - `apps/web/.env.local` → `VITE_CLERK_PUBLISHABLE_KEY`
   - `apps/api/.env.local` → `CLERK_SECRET_KEY`
   - Both should be from the same Clerk application

### Organization Selector Not Loading?

1. **Check network tab** in DevTools
2. **Look for tRPC call:** `organization.myOrganizations`
3. **If 401 error:** Clerk authentication issue
4. **If 500 error:** Check API server logs

---

## What's Working Now

✅ Firebase initializes correctly
✅ App loads without white screen
✅ CloudStorageAdapter can access Firestore
✅ Clerk authentication works
✅ Dashboard page accessible at /dashboard
✅ Organization selector renders (needs API server)
✅ Projects sidebar renders (needs API server)

## What Needs API Server Running

⚠️ Organization selector loading organizations
⚠️ Projects sidebar loading projects
⚠️ Creating/updating projects
⚠️ All tRPC API calls

## Next Steps

1. **Start all services:** `bun run dev`
2. **Test Phase 3 features:**
   - Organization selector (top-right)
   - Dashboard (/dashboard)
   - Projects sidebar (folder icon)
3. **Create test data in Firestore** (if needed)
4. **Review PHASE_3_COMPLETION.md** for full feature list

---

## Commits Made

### Commit: `fix: Resolve Firebase initialization and add Phase 3 development guide`

**Files Changed:**
- `DEVELOPMENT.md` - Added Phase 3 monorepo documentation
- `apps/web/.env.local` - Fixed Firebase config format (not committed, git-ignored)

**Git Status:**
```bash
git log -1 --oneline
# e61894fe fix: Resolve Firebase initialization and add Phase 3 development guide
```

---

## Key Learnings

### 1. Environment Variable Formats Matter

- Drawink expects `VITE_APP_FIREBASE_CONFIG` as **JSON string**
- Individual variables (VITE_FIREBASE_API_KEY, etc.) are **NOT used**
- Always check how the code parses environment variables

### 2. Monorepo Environment Variables

- Root `.env` files are global (Turborepo)
- Package-specific `.env.local` can override
- `.env.local` should **never** be committed (contains secrets)

### 3. Multi-Service Architecture

- Modern apps need multiple services running
- Web app alone is not enough (needs API and WS)
- Use Turborepo commands to manage all services

### 4. Firebase Initialization Order

- Firebase must be initialized **before** any Firebase service is used
- CloudStorageAdapter calls `getFirestore()` in constructor
- If Firebase config is empty, initialization silently fails

---

## References

- [PHASE_3_COMPLETION.md](./PHASE_3_COMPLETION.md) - Phase 3 features
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Updated development guide
- [deep-cooking-summit.md](./deep-cooking-summit.md) - Complete project plan
- [apps/web/src/data/firebase.ts](./apps/web/src/data/firebase.ts) - Firebase initialization code
- [turbo.json](./turbo.json) - Turborepo configuration

---

**Status:** ✅ All fixes applied and committed
**Date:** 2026-01-26
**Branch:** revamp/complete-overhaul
