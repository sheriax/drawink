# Drawink Complete Revamp Plan

## Executive Summary

**Project:** Drawink - A whiteboard SaaS product (fork of Excalidraw)
**Branch:** `revamp/complete-overhaul`
**Scope:** Complete restructure to Turborepo monorepo with new tech stack

---

## User Requirements Summary

### Product Vision
- **Type:** Personal whiteboard + Team collaboration + Public SaaS
- **Branding:** Keep "Drawink" name, remove all Excalidraw references
- **Features:** Keep all Excalidraw Plus features, improve AI/Mermaid

### Tech Stack Decisions

| Layer | Choice | Notes |
|-------|--------|-------|
| **Monorepo** | Turborepo | Fast, caching, works with Bun |
| **Runtime** | Bun | Keep current |
| **Web App** | Vite + React | Keep current |
| **Landing** | Astro (latest) | New |
| **Docs** | Docusaurus | Keep, internal only |
| **API** | tRPC + Hono | New |
| **WebSocket** | Socket.IO | Keep current |
| **Database** | Firebase Firestore | Keep current |
| **File Storage** | Firebase Storage | Keep current |
| **Auth** | Clerk | New (replace Firebase Auth) |
| **Payments** | Stripe | New |
| **State** | Jotai | Keep current |
| **Styling** | Tailwind CSS | Migrate from SCSS |
| **UI Components** | Radix UI | Keep current |
| **TypeScript** | 5.3 | Upgrade from 4.9.4 |
| **Linting** | Biome | Replace ESLint + Prettier |
| **Testing** | Vitest + Testing Library | Minimal, critical paths |
| **AI Provider** | OpenAI GPT-4 | For text-to-diagram |
| **Feature Flags** | Firebase Remote Config | |
| **Analytics** | Vercel Analytics | |

### Deployment

| App | Platform |
|-----|----------|
| Web App | Vercel |
| Landing | Vercel |
| API Server | Google Cloud Run |
| WebSocket Server | Google Cloud Run |
| Docs | Vercel |

---

## New Project Structure

```
drawink/
├── apps/
│   ├── web/                 # Main Vite + React app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── pages/
│   │   │   └── stores/      # Jotai atoms
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── api/                 # tRPC + Hono server
│   │   ├── src/
│   │   │   ├── routers/     # tRPC routers
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── ws/                  # WebSocket server
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── landing/             # Astro marketing site
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── layouts/
│   │   ├── astro.config.mjs
│   │   └── package.json
│   │
│   └── docs/                # Docusaurus (internal)
│       ├── docs/
│       ├── docusaurus.config.js
│       └── package.json
│
├── packages/
│   ├── common/              # KEEP - utilities, constants
│   ├── math/                # KEEP - 2D math functions
│   ├── element/             # KEEP - element logic
│   ├── drawink/             # KEEP - core React component
│   │
│   ├── types/               # NEW - shared TypeScript types
│   │   ├── src/
│   │   │   ├── api.ts       # API types
│   │   │   ├── db.ts        # Database schemas
│   │   │   ├── auth.ts      # Auth types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── utils/               # NEW - shared utilities
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── ui/                  # NEW - shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── styles/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── config/              # NEW - shared configs
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── tailwind/
│   │
│   └── trpc/                # NEW - tRPC router definitions
│       ├── src/
│       └── package.json
│
├── tooling/                 # Build tools, scripts
│   └── scripts/
│
├── turbo.json               # Turborepo config
├── package.json             # Root package.json
├── biome.json               # Biome config
├── tsconfig.json            # Root TS config
└── .env.example
```

---

## Turborepo / Monorepo Setup (Detailed)

### Workspace Configuration

**Root `package.json`:**
```json
{
  "name": "drawink",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "@biomejs/biome": "^1.9.0",
    "typescript": "~5.3.0"
  },
  "packageManager": "bun@1.3.3"
}
```

**Dependency Boundaries (STRICT RULE):**
```
apps/web     → depends on → packages/* (any)
apps/api     → depends on → packages/* (any)
apps/ws      → depends on → packages/* (any)
apps/landing → depends on → packages/ui, packages/config
apps/docs    → depends on → (none)

packages/*   → NEVER depends on → apps/*
packages/ui  → depends on → packages/types, packages/config
packages/trpc → depends on → packages/types
```

### turbo.json Pipeline Design

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "globalEnv": ["NODE_ENV"],

  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".astro/**"],
      "cache": true
    },

    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },

    "lint": {
      "dependsOn": ["^build"],
      "cache": true
    },

    "typecheck": {
      "dependsOn": ["^build"],
      "cache": true
    },

    "test": {
      "dependsOn": ["^build"],
      "cache": true,
      "outputs": ["coverage/**"]
    },

    "clean": {
      "cache": false
    }
  }
}
```

**Caching Rules:**
| Task | Cache | Reason |
|------|-------|--------|
| build | ✅ YES | Deterministic output |
| lint | ✅ YES | Same input = same result |
| typecheck | ✅ YES | Same input = same result |
| test | ✅ YES | Same input = same result |
| dev | ❌ NO | Live server, not deterministic |
| clean | ❌ NO | Destructive operation |

### Environment Variables Strategy

**File Structure:**
```
drawink/
├── .env.example              # Template for all env vars
├── .env.local                # Local dev (gitignored)
├── apps/
│   ├── web/
│   │   ├── .env.example      # Web-specific vars
│   │   └── .env.local        # Local overrides (gitignored)
│   ├── api/
│   │   ├── .env.example      # API-specific vars
│   │   └── .env.local        # Local overrides (gitignored)
│   ├── ws/
│   │   ├── .env.example      # WS-specific vars
│   │   └── .env.local        # Local overrides (gitignored)
```

**STRICT RULE: Frontend ≠ Backend Secrets**
```bash
# apps/web/.env.example (PUBLIC - prefixed with VITE_)
VITE_CLERK_PUBLISHABLE_KEY=pk_xxx
VITE_FIREBASE_CONFIG={"apiKey":"..."}
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3003
VITE_STRIPE_PUBLISHABLE_KEY=pk_xxx

# apps/api/.env.example (SECRET - never in frontend)
CLERK_SECRET_KEY=sk_xxx
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
OPENAI_API_KEY=sk_xxx
FIREBASE_ADMIN_SDK={"projectId":"..."}

# apps/ws/.env.example (SECRET)
CLERK_SECRET_KEY=sk_xxx
FIREBASE_ADMIN_SDK={"projectId":"..."}
```

### Port Allocation

| App | Dev Port | Description |
|-----|----------|-------------|
| web | 5173 | Vite dev server |
| api | 3001 | tRPC + Hono API |
| ws | 3003 | WebSocket server |
| landing | 4321 | Astro dev server |
| docs | 3000 | Docusaurus dev server |

### Local Developer Experience

**Single Command to Start Everything:**
```bash
bun run dev
# Runs all apps in parallel via Turborepo
```

**Individual App Development:**
```bash
bun run dev --filter=@drawink/web        # Just web app
bun run dev --filter=@drawink/api        # Just API
bun run dev --filter=@drawink/web --filter=@drawink/api  # Web + API
```

**Package Scripts (each app's package.json):**
```json
// apps/web/package.json
{
  "name": "@drawink/web",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "biome check ."
  }
}

// apps/api/package.json
{
  "name": "@drawink/api",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir=dist --target=bun",
    "start": "bun dist/index.js",
    "typecheck": "tsc --noEmit",
    "lint": "biome check ."
  }
}
```

### CI/CD Compatibility

**Vercel Deployment (web, landing, docs):**
```json
// vercel.json (root)
{
  "buildCommand": "turbo run build --filter=@drawink/web",
  "outputDirectory": "apps/web/dist",
  "installCommand": "bun install"
}
```

**Cloud Run Deployment (api, ws):**
```dockerfile
# apps/api/Dockerfile
FROM oven/bun:1.3.3 AS builder
WORKDIR /app
COPY package.json bun.lockb ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN bun install --frozen-lockfile
RUN cd apps/api && bun run build

FROM oven/bun:1.3.3-slim
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
EXPOSE 8080
CMD ["bun", "dist/index.js"]
```

**Build Independence:**
- Each app can build independently
- Docker builds don't require Turborepo
- CI uses Turborepo for caching, prod uses direct builds

---

## Operational Safety & Production Readiness

### 1. Rollback & Feature Kill-Switch Strategy

**Firebase Remote Config Flags:**
```typescript
// packages/config/src/featureFlags.ts
export interface FeatureFlags {
  // Core features
  aiTextToDiagram: boolean;
  aiMermaidConvert: boolean;

  // Billing
  billingEnabled: boolean;
  stripeCheckoutEnabled: boolean;

  // Team features
  organizationsEnabled: boolean;
  projectsEnabled: boolean;

  // Experimental
  versionHistoryEnabled: boolean;
  templatesEnabled: boolean;

  // Emergency
  maintenanceMode: boolean;
  readOnlyMode: boolean;
}

// Usage in app
import { getRemoteConfig, getValue } from 'firebase/remote-config';

const rc = getRemoteConfig();
const aiEnabled = getValue(rc, 'aiTextToDiagram').asBoolean();
```

**Kill-Switch Procedure:**
1. Go to Firebase Console → Remote Config
2. Set flag to `false`
3. Click "Publish changes"
4. Apps fetch new config within 12 hours (or force refresh)

**Instant Kill-Switch (Force Refresh):**
```typescript
// Force fetch on critical flags
import { fetchAndActivate } from 'firebase/remote-config';

// Check flag status every 5 minutes in production
setInterval(() => fetchAndActivate(rc), 5 * 60 * 1000);
```

**Rollback Strategy:**
- Keep last 3 production builds tagged in Git
- Vercel: Instant rollback via dashboard
- Cloud Run: Keep last 3 revisions, rollback via `gcloud run services update-traffic`

**Data Recovery:**
- Old Firestore collections kept in read-only mode for 30 days
- Prefix old collections with `_archive_` + date
- Recovery script to restore from archive

### 2. AI & Realtime Cost Guardrails

**AI Usage Limits:**
```typescript
// Firestore: users/{userId}
interface UserAIUsage {
  dailyTokensUsed: number;
  monthlyTokensUsed: number;
  lastResetDate: Timestamp;
  lastResetMonth: string; // "2024-01"
}

// Limits by tier
const AI_LIMITS = {
  free: { dailyTokens: 10_000, monthlyTokens: 100_000 },
  pro: { dailyTokens: 100_000, monthlyTokens: 1_000_000 },
  team: { dailyTokens: 500_000, monthlyTokens: 5_000_000 },
};
```

**Cost Guardrails Implementation:**
```typescript
// apps/api/src/middleware/aiRateLimit.ts
export const checkAIUsage = async (userId: string, estimatedTokens: number) => {
  const usage = await getUserAIUsage(userId);
  const limits = await getUserLimits(userId);

  // Hard limit: Block request
  if (usage.dailyTokensUsed + estimatedTokens > limits.dailyTokens) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Daily AI limit reached. Upgrade to continue.',
    });
  }

  // Soft limit: Warn user (80% threshold)
  if (usage.dailyTokensUsed > limits.dailyTokens * 0.8) {
    return { warning: 'Approaching daily AI limit (80% used)' };
  }

  return { ok: true };
};
```

**WebSocket Throttling:**
```typescript
// apps/ws/src/middleware/throttle.ts
const THROTTLE_CONFIG = {
  broadcastsPerSecond: 10,      // Max scene updates per second
  cursorUpdatesPerSecond: 30,   // Max cursor position updates
  maxPayloadSize: 1_000_000,    // 1MB max per message
};

// Per-socket rate limiter
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

export const throttleSocket = (socketId: string, type: 'broadcast' | 'cursor') => {
  const limit = type === 'broadcast'
    ? THROTTLE_CONFIG.broadcastsPerSecond
    : THROTTLE_CONFIG.cursorUpdatesPerSecond;

  const now = Date.now();
  const state = rateLimiter.get(socketId) || { count: 0, resetAt: now + 1000 };

  if (now > state.resetAt) {
    state.count = 0;
    state.resetAt = now + 1000;
  }

  if (state.count >= limit) {
    return false; // Drop message
  }

  state.count++;
  rateLimiter.set(socketId, state);
  return true;
};
```

**AI Calls Centralized (STRICT RULE):**
```
❌ NEVER: Frontend → OpenAI directly
✅ ALWAYS: Frontend → API → OpenAI

Reason: Cost control, rate limiting, logging, kill-switch
```

### 3. Realtime Conflict Resolution Policy

**Conflict Resolution Strategy: Last-Write-Wins with Version Checks**

```typescript
// packages/types/src/sync.ts
interface SyncState {
  version: number;           // Incrementing version number
  checksum: string;          // SHA-256 of elements JSON
  lastSyncedAt: Timestamp;
  pendingChanges: boolean;
}

// Conflict detection
const detectConflict = (local: SyncState, remote: SyncState): ConflictType => {
  if (local.version === remote.version) {
    return 'NO_CONFLICT';
  }

  if (local.version < remote.version && !local.pendingChanges) {
    return 'SAFE_PULL'; // Just pull remote
  }

  if (local.version < remote.version && local.pendingChanges) {
    return 'CONFLICT'; // Both changed
  }

  return 'SAFE_PUSH'; // Local is newer
};
```

**Conflict Resolution Flow:**
```
1. User makes edit (offline or online)
2. App increments local version, marks pendingChanges=true
3. On sync attempt:
   a. Fetch remote version
   b. Compare versions and checksums
   c. If CONFLICT:
      - Show conflict dialog
      - Options: "Keep Mine", "Keep Theirs", "Merge"
      - For "Merge": Create new version with both changes
   d. Log conflict event for debugging
4. On successful sync: pendingChanges=false
```

**Offline Edit Handling:**
```typescript
// apps/web/src/lib/offlineSync.ts
const handleReconnect = async () => {
  const localState = await getLocalSyncState();
  const remoteState = await fetchRemoteSyncState();

  const conflict = detectConflict(localState, remoteState);

  switch (conflict) {
    case 'NO_CONFLICT':
      // Nothing to do
      break;

    case 'SAFE_PULL':
      await pullRemoteChanges();
      break;

    case 'SAFE_PUSH':
      await pushLocalChanges();
      break;

    case 'CONFLICT':
      // Show conflict resolution UI
      showConflictDialog({
        localVersion: localState,
        remoteVersion: remoteState,
        onKeepLocal: () => forcePush(localState),
        onKeepRemote: () => forcePull(remoteState),
        onRestore: () => showVersionHistory(),
      });
      break;
  }
};

// Listen for online status
window.addEventListener('online', handleReconnect);
```

**Conflict Logging:**
```typescript
// Log all conflicts for debugging
interface ConflictLog {
  boardId: string;
  userId: string;
  localVersion: number;
  remoteVersion: number;
  localChecksum: string;
  remoteChecksum: string;
  resolution: 'keep_local' | 'keep_remote' | 'merge' | 'restore';
  timestamp: Timestamp;
}

// Store in Firestore: conflict_logs/{id}
```

### 4. Observability & Error Tracking (Minimal)

**Vercel Analytics (Frontend):**
- Automatic page views
- Web Vitals (LCP, FID, CLS)
- Custom events for critical flows

```typescript
// apps/web/src/lib/analytics.ts
import { track } from '@vercel/analytics';

// Track critical events only
export const trackEvent = (name: string, data?: Record<string, any>) => {
  track(name, data);
};

// Usage
trackEvent('board_created');
trackEvent('ai_diagram_generated', { tokens: 1500 });
trackEvent('checkout_started', { tier: 'pro' });
```

**API Error Logging:**
```typescript
// apps/api/src/middleware/errorHandler.ts
import { TRPCError } from '@trpc/server';

export const errorHandler = (error: unknown, ctx: Context) => {
  // Only log critical errors
  const criticalCategories = ['auth', 'billing', 'ai', 'sync'];

  if (error instanceof TRPCError) {
    const isCritical = criticalCategories.some(cat =>
      ctx.path?.includes(cat)
    );

    if (isCritical || error.code === 'INTERNAL_SERVER_ERROR') {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        path: ctx.path,
        code: error.code,
        message: error.message,
        userId: ctx.user?.id,
      }));
    }
  }

  throw error;
};
```

**WebSocket Error Logging:**
```typescript
// apps/ws/src/middleware/errorHandler.ts
socket.on('error', (error) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    socketId: socket.id,
    roomId: currentRoom,
    error: error.message,
  }));
});
```

### 5. Firestore Security Rules (CRITICAL)

**Location:** `firebase-project/firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // =====================
    // HELPER FUNCTIONS
    // =====================

    // Check if user is authenticated (Clerk JWT verified by backend)
    function isAuthenticated() {
      return request.auth != null;
    }

    // Check if user owns the resource
    function isOwner(resource) {
      return isAuthenticated() && resource.data.ownerId == request.auth.uid;
    }

    // Check if user is member of organization
    function isOrgMember(orgId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid));
    }

    // Check if user has role in organization
    function hasOrgRole(orgId, roles) {
      return isOrgMember(orgId) &&
        get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)).data.role in roles;
    }

    // Check if resource is not soft-deleted
    function isNotDeleted(resource) {
      return !('deletedAt' in resource.data) || resource.data.deletedAt == null;
    }

    // =====================
    // USERS COLLECTION
    // =====================
    match /users/{userId} {
      // Users can only read/write their own document
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow write: if isAuthenticated() && request.auth.uid == userId;

      // AI usage subcollection
      match /ai_usage/{document=**} {
        allow read: if isAuthenticated() && request.auth.uid == userId;
        // Only backend can write (via Admin SDK)
        allow write: if false;
      }
    }

    // =====================
    // ORGANIZATIONS COLLECTION
    // =====================
    match /organizations/{orgId} {
      // Members can read org details
      allow read: if isOrgMember(orgId);
      // Only admins/owners can update org
      allow update: if hasOrgRole(orgId, ['owner', 'admin']);
      // Only backend creates orgs (via Clerk webhook)
      allow create, delete: if false;

      // Members subcollection
      match /members/{memberId} {
        allow read: if isOrgMember(orgId);
        allow write: if hasOrgRole(orgId, ['owner', 'admin']);
      }
    }

    // =====================
    // PROJECTS COLLECTION
    // =====================
    match /projects/{projectId} {
      // Owner or org members can read
      allow read: if isOwner(resource) ||
        (resource.data.organizationId != null && isOrgMember(resource.data.organizationId));

      // Owner or org admins can write
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource) ||
        (resource.data.organizationId != null && hasOrgRole(resource.data.organizationId, ['owner', 'admin']));
    }

    // =====================
    // BOARDS COLLECTION
    // =====================
    match /boards/{boardId} {
      // Complex read rules
      allow read: if
        // Owner can always read
        isOwner(resource) ||
        // Public boards anyone can read
        resource.data.isPublic == true ||
        // Org members can read org boards
        (resource.data.organizationId != null && isOrgMember(resource.data.organizationId)) ||
        // Explicit collaborators can read
        (isAuthenticated() && request.auth.uid in resource.data.collaboratorIds);

      // Create: any authenticated user
      allow create: if isAuthenticated();

      // Update/Delete: owner, org admin, or editor collaborator
      allow update: if isOwner(resource) ||
        (resource.data.organizationId != null && hasOrgRole(resource.data.organizationId, ['owner', 'admin', 'member'])) ||
        (isAuthenticated() && request.auth.uid in resource.data.collaboratorIds);

      allow delete: if isOwner(resource) ||
        (resource.data.organizationId != null && hasOrgRole(resource.data.organizationId, ['owner', 'admin']));

      // Board content subcollection
      match /content/{contentId} {
        allow read: if
          get(/databases/$(database)/documents/boards/$(boardId)).data.ownerId == request.auth.uid ||
          get(/databases/$(database)/documents/boards/$(boardId)).data.isPublic == true ||
          (isAuthenticated() && request.auth.uid in get(/databases/$(database)/documents/boards/$(boardId)).data.collaboratorIds);

        // Only backend writes content (via API with conflict resolution)
        allow write: if false;
      }

      // Board versions subcollection
      match /versions/{versionId} {
        allow read: if
          get(/databases/$(database)/documents/boards/$(boardId)).data.ownerId == request.auth.uid ||
          (isAuthenticated() && request.auth.uid in get(/databases/$(database)/documents/boards/$(boardId)).data.collaboratorIds);

        // Only backend writes versions
        allow write: if false;
      }
    }

    // =====================
    // TEMPLATES COLLECTION
    // =====================
    match /templates/{templateId} {
      // Built-in templates: anyone can read
      // Org templates: only org members
      allow read: if
        resource.data.isBuiltIn == true ||
        (resource.data.organizationId == null && isOwner(resource)) ||
        (resource.data.organizationId != null && isOrgMember(resource.data.organizationId));

      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource) ||
        (resource.data.organizationId != null && hasOrgRole(resource.data.organizationId, ['owner', 'admin']));
    }

    // =====================
    // COLLABORATION ROOMS (Existing - for real-time)
    // =====================
    match /scenes/{roomId} {
      // Anyone with the room link can read/write
      // Security is via encrypted data + room key
      allow read, write: if true;
    }

    // =====================
    // CONFLICT LOGS (Backend only)
    // =====================
    match /conflict_logs/{logId} {
      allow read, write: if false;
    }

    // =====================
    // DENY ALL OTHER ACCESS
    // =====================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 6. Clerk + Firebase Webhook Sync Strategy

**Problem:** Clerk manages auth, but we need user data in Firestore for queries.

**Solution:** Webhook-based sync with idempotency.

**Webhook Endpoint:** `apps/api/src/routers/webhooks/clerk.ts`

```typescript
// apps/api/src/routers/webhooks/clerk.ts
import { Hono } from 'hono';
import { Webhook } from 'svix';
import { adminDb } from '../../lib/firebase-admin';

const clerkWebhook = new Hono();

// Verify webhook signature
const verifyWebhook = (payload: string, headers: Record<string, string>) => {
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  return wh.verify(payload, headers);
};

clerkWebhook.post('/clerk', async (c) => {
  const payload = await c.req.text();
  const headers = {
    'svix-id': c.req.header('svix-id')!,
    'svix-timestamp': c.req.header('svix-timestamp')!,
    'svix-signature': c.req.header('svix-signature')!,
  };

  let event;
  try {
    event = verifyWebhook(payload, headers);
  } catch (err) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const eventType = event.type;
  const data = event.data;

  switch (eventType) {
    // =====================
    // USER EVENTS
    // =====================
    case 'user.created':
      await adminDb.collection('users').doc(data.id).set({
        id: data.id,
        email: data.email_addresses[0]?.email_address,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        photoUrl: data.image_url,
        createdAt: new Date(data.created_at),
        lastLoginAt: new Date(),
        subscription: {
          tier: 'free',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          expiresAt: null,
        },
      });
      break;

    case 'user.updated':
      await adminDb.collection('users').doc(data.id).update({
        email: data.email_addresses[0]?.email_address,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        photoUrl: data.image_url,
      });
      break;

    case 'user.deleted':
      // Soft delete - mark as deleted, don't remove
      await adminDb.collection('users').doc(data.id).update({
        deletedAt: new Date(),
      });
      break;

    // =====================
    // ORGANIZATION EVENTS
    // =====================
    case 'organization.created':
      await adminDb.collection('organizations').doc(data.id).set({
        id: data.id,
        name: data.name,
        ownerId: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(),
        subscription: {
          tier: 'free',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          expiresAt: null,
        },
      });
      break;

    case 'organization.updated':
      await adminDb.collection('organizations').doc(data.id).update({
        name: data.name,
        updatedAt: new Date(),
      });
      break;

    case 'organization.deleted':
      await adminDb.collection('organizations').doc(data.id).update({
        deletedAt: new Date(),
      });
      break;

    // =====================
    // ORGANIZATION MEMBERSHIP EVENTS
    // =====================
    case 'organizationMembership.created':
      await adminDb
        .collection('organizations')
        .doc(data.organization.id)
        .collection('members')
        .doc(data.public_user_data.user_id)
        .set({
          userId: data.public_user_data.user_id,
          role: mapClerkRoleToOurs(data.role),
          joinedAt: new Date(data.created_at),
        });
      break;

    case 'organizationMembership.updated':
      await adminDb
        .collection('organizations')
        .doc(data.organization.id)
        .collection('members')
        .doc(data.public_user_data.user_id)
        .update({
          role: mapClerkRoleToOurs(data.role),
        });
      break;

    case 'organizationMembership.deleted':
      await adminDb
        .collection('organizations')
        .doc(data.organization.id)
        .collection('members')
        .doc(data.public_user_data.user_id)
        .delete();
      break;

    default:
      console.log('Unhandled webhook event:', eventType);
  }

  return c.json({ received: true });
});

// Map Clerk roles to our roles
const mapClerkRoleToOurs = (clerkRole: string): 'owner' | 'admin' | 'member' => {
  switch (clerkRole) {
    case 'admin':
      return 'admin';
    case 'basic_member':
      return 'member';
    default:
      return 'member';
  }
};

export default clerkWebhook;
```

**Webhook Configuration in Clerk Dashboard:**
1. Go to Clerk Dashboard → Webhooks
2. Create endpoint: `https://api.drawink.app/webhooks/clerk`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organization.created`
   - `organization.updated`
   - `organization.deleted`
   - `organizationMembership.created`
   - `organizationMembership.updated`
   - `organizationMembership.deleted`
4. Copy webhook secret to `CLERK_WEBHOOK_SECRET`

**Idempotency:** Webhook handlers use `set()` and `update()` which are idempotent.

### 7. AI Input Validation (Before OpenAI Calls)

```typescript
// apps/api/src/services/ai/validation.ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

// Input schema for text-to-diagram
const textToDiagramInputSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt cannot be empty')
    .max(4000, 'Prompt too long (max 4000 chars)')
    .refine(
      (val) => !containsMaliciousPatterns(val),
      'Invalid prompt content'
    ),
  diagramType: z.enum(['flowchart', 'sequence', 'mindmap', 'er', 'general']),
  style: z.enum(['hand-drawn', 'clean']).default('hand-drawn'),
});

// Check for prompt injection / malicious patterns
const containsMaliciousPatterns = (text: string): boolean => {
  const maliciousPatterns = [
    /ignore previous instructions/i,
    /disregard all previous/i,
    /you are now/i,
    /act as/i,
    /pretend you are/i,
    /system:/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
  ];

  return maliciousPatterns.some(pattern => pattern.test(text));
};

// Estimate tokens before calling OpenAI
const estimateTokens = (text: string): number => {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
};

// Main validation function
export const validateAIInput = async (
  input: unknown,
  userId: string
): Promise<z.infer<typeof textToDiagramInputSchema>> => {
  // 1. Schema validation
  const parsed = textToDiagramInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: parsed.error.errors[0].message,
    });
  }

  // 2. Estimate tokens
  const estimatedTokens = estimateTokens(parsed.data.prompt);

  // 3. Check rate limits BEFORE calling OpenAI
  const usageCheck = await checkAIUsage(userId, estimatedTokens);
  if (!usageCheck.ok && usageCheck.error) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: usageCheck.error,
    });
  }

  // 4. Return validated input
  return parsed.data;
};

// Usage in tRPC router
export const aiRouter = router({
  textToDiagram: protectedProcedure
    .input(z.unknown())
    .mutation(async ({ input, ctx }) => {
      // Validate BEFORE any OpenAI calls
      const validatedInput = await validateAIInput(input, ctx.user.id);

      // Now safe to call OpenAI
      const result = await generateDiagram(validatedInput);

      // Update usage after successful call
      await incrementAIUsage(ctx.user.id, result.tokensUsed);

      return result;
    }),
});
```

### 8. Data Retention & Cleanup Rules

**Retention Policies:**

| Data Type | Free Tier | Pro Tier | Team Tier |
|-----------|-----------|----------|-----------|
| Archived boards | 30 days | 90 days | 1 year |
| Version history | 10 versions | 50 versions | 500 versions |
| Deleted boards | 7 days | 30 days | 30 days |
| AI usage logs | 7 days | 30 days | 90 days |

**Soft Delete (Default for All Destructive Operations):**
```typescript
// Never hard delete immediately
interface SoftDeletable {
  deletedAt?: Timestamp;
  deletedBy?: string;
  scheduledPurgeAt?: Timestamp;
}

// Mark as deleted
const softDelete = async (boardId: string, userId: string) => {
  const retentionDays = await getUserRetentionDays(userId);

  await updateDoc(doc(db, 'boards', boardId), {
    deletedAt: serverTimestamp(),
    deletedBy: userId,
    scheduledPurgeAt: Timestamp.fromDate(
      new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)
    ),
  });
};
```

**Cleanup Jobs (Cloud Functions / Scheduled):**
```typescript
// Run daily via Cloud Scheduler
export const cleanupJob = async () => {
  const now = Timestamp.now();

  // 1. Purge soft-deleted boards past retention
  const expiredBoards = await getDocs(
    query(
      collection(db, 'boards'),
      where('scheduledPurgeAt', '<=', now)
    )
  );

  for (const doc of expiredBoards.docs) {
    await hardDeleteBoard(doc.id); // Delete board + content + versions
  }

  // 2. Trim version history for free users
  const freeUsers = await getFreeUsers();
  for (const user of freeUsers) {
    await trimVersionHistory(user.id, 10); // Keep only 10 versions
  }

  // 3. Clear old conflict logs
  await clearOldLogs('conflict_logs', 90); // 90 days retention

  console.log('Cleanup job completed', {
    boardsPurged: expiredBoards.size,
    timestamp: now.toDate(),
  });
};
```

---

## Implementation Phases

### Phase 1: Core Refactor (Foundation)

#### Step 1.1: Initialize Turborepo Structure
1. Create new folder structure under `apps/` and `packages/`
2. Set up `turbo.json` with pipeline configuration
3. Configure root `package.json` with workspaces
4. Set up Biome for linting/formatting

**Files to create:**
- `turbo.json`
- `biome.json`
- `apps/web/package.json`
- `apps/api/package.json`
- `apps/ws/package.json`
- `apps/landing/package.json`
- `apps/docs/package.json`
- `packages/types/package.json`
- `packages/utils/package.json`
- `packages/ui/package.json`
- `packages/config/package.json`
- `packages/trpc/package.json`

#### Step 1.2: Migrate Web App
1. Move `drawink-app/` contents to `apps/web/`
2. Update import paths
3. Migrate SCSS to Tailwind CSS
4. Remove all Excalidraw brand references
5. Update to TypeScript 5.3

**Files to migrate:**
- `drawink-app/` → `apps/web/src/`
- `drawink-app/vite.config.ts` → `apps/web/vite.config.ts`

#### Step 1.3: Migrate Backend Servers
1. Move `json-server/` to `apps/api/`
2. Add tRPC setup with Hono adapter
3. Move `websocket-server/` to `apps/ws/`
4. Update Docker configurations

**Files to migrate:**
- `json-server/` → `apps/api/`
- `websocket-server/` → `apps/ws/`

#### Step 1.4: Migrate Packages
1. Keep existing packages (common, math, element, drawink)
2. Create new shared packages (types, utils, ui, config, trpc)
3. Move shared types to `packages/types/`
4. Create shared UI components in `packages/ui/`

#### Step 1.5: Create Landing Page
1. Initialize Astro project in `apps/landing/`
2. Create marketing pages
3. Add pricing page

#### Step 1.6: Migrate Docs
1. Move `dev-docs/` to `apps/docs/`
2. Clean up to internal development docs only
3. Remove public API documentation

---

### Phase 2: Authentication (Clerk)

#### Step 2.1: Set Up Clerk
1. Install `@clerk/clerk-react` in web app
2. Configure Clerk provider
3. Set up sign-in/sign-up pages
4. Enable Email + Google + GitHub providers

**Files to create/modify:**
- `apps/web/src/lib/clerk.ts`
- `apps/web/src/components/auth/`
- `apps/api/src/middleware/auth.ts`

#### Step 2.2: Remove Firebase Auth
1. Remove Firebase Auth code from `firebase.ts`
2. Update all auth-related atoms
3. Migrate existing users (if any)

#### Step 2.3: Integrate Clerk with API
1. Add Clerk middleware to tRPC
2. Protect API routes
3. Add user context to procedures

---

### Phase 3: Team/Organization Features

#### Step 3.1: Set Up Clerk Organizations
1. Enable Organizations in Clerk dashboard
2. Add organization selector UI
3. Configure roles: Owner, Admin, Member

#### Step 3.2: Projects/Folders Structure
1. Create project model in Firestore
2. Add project CRUD operations
3. Update sidebar to show projects
4. Link boards to projects

**Firestore Schema (IMPORTANT: Support folders/projects from day 1, even if UI is flat):**
```typescript
// users collection (linked to Clerk)
interface User {
  id: string;              // Clerk user ID
  email: string;
  name: string;
  photoUrl?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  subscription: {
    tier: 'free' | 'pro' | 'team';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    expiresAt?: Timestamp;
  };
}

// organizations collection (linked to Clerk Organizations)
interface Organization {
  id: string;              // Clerk org ID
  name: string;
  ownerId: string;         // Clerk user ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  subscription: {
    tier: 'free' | 'team';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    expiresAt?: Timestamp;
  };
}

// projects collection (folders - SCHEMA READY from day 1)
interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;          // For UI distinction
  icon?: string;           // Optional icon
  organizationId: string | null;  // null = personal
  ownerId: string;         // Clerk user ID
  parentProjectId: string | null;  // For nested folders (future)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  archivedAt?: Timestamp;  // Soft delete
}

// boards collection
interface Board {
  id: string;
  name: string;
  thumbnail?: string;      // Preview image URL
  projectId: string | null;  // Can be in a project (folder)
  organizationId: string | null;  // null = personal
  ownerId: string;         // Clerk user ID
  collaborators: {         // Direct board sharing
    userId: string;
    role: 'editor' | 'viewer';
    addedAt: Timestamp;
  }[];
  isPublic: boolean;       // Shareable link access
  publicLinkId?: string;   // For share links
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastOpenedAt: Timestamp;
  archivedAt?: Timestamp;  // Soft delete
  version: number;         // For conflict resolution
}

// board_content subcollection (boards/{boardId}/content/current)
interface BoardContent {
  elementsJSON: string;    // Stringified elements
  appStateJSON: string;    // Stringified app state
  updatedAt: Timestamp;
  updatedBy: string;       // Clerk user ID
  version: number;
  checksum: string;        // For conflict detection
}

// board_versions subcollection (boards/{boardId}/versions/{versionId})
interface BoardVersion {
  id: string;
  elementsJSON: string;
  appStateJSON: string;
  createdAt: Timestamp;
  createdBy: string;
  note?: string;           // Optional version note
  isAutoSave: boolean;     // Auto vs manual save
}

// templates collection
interface Template {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  elementsJSON: string;
  appStateJSON: string;
  isBuiltIn: boolean;      // System template
  organizationId: string | null;  // Org-specific template
  createdBy: string | null;       // User-created
  createdAt: Timestamp;
  usageCount: number;      // Popularity tracking
}
```

#### Step 3.3: Dashboard Page
1. Create minimal dashboard (`/dashboard`)
2. Show recent boards
3. Quick create board button
4. Team activity (if in org)

---

### Phase 4: Billing (Stripe)

#### Step 4.1: Set Up Stripe
1. Install Stripe SDK
2. Create pricing tiers in Stripe dashboard
3. Set up webhook endpoint

**Pricing Tiers:**
- **Free:** Limited boards, no team features
- **Pro:** Unlimited boards, version history, templates
- **Team:** Everything + organizations, projects, collaboration

#### Step 4.2: Create Billing API
1. Add billing router to tRPC
2. Create checkout session endpoint
3. Handle webhook events
4. Track subscription status

#### Step 4.3: Add Billing UI
1. Create pricing page
2. Add upgrade prompts
3. Create billing settings page
4. Handle subscription management

---

## Feature Implementations

### AI Text-to-Diagram (Improved)
- Use AIProvider as Wrapper with (OpenAI GPT-40-mini) for generation
- Support Mermaid syntax input
- Convert Mermaid to native Drawink elements
- Add AI prompt templates

### Version History
- Auto-save snapshots every 5 minutes
- Store in Firestore subcollection
- Add version browser UI
- Restore functionality

### Templates
- Built-in templates (bundled JSON files)
- User-created templates (stored in Firestore)
- Template gallery UI
- Share templates within org

### Export
- PNG export (current)
- SVG export (current)
- PDF export (current)
- JSON export (raw data)

---

## Critical Files to Modify

### Root Level
- `package.json` - Convert to workspace root
- `turbo.json` - New file
- `biome.json` - New file (replace eslint/prettier configs)
- `tsconfig.json` - Update for monorepo

### Apps/Web (migrate from drawink-app)
- `apps/web/src/App.tsx` - Main app component
- `apps/web/src/lib/clerk.ts` - Auth setup
- `apps/web/src/stores/` - Jotai atoms
- `apps/web/src/components/` - UI components
- `apps/web/tailwind.config.ts` - Tailwind config

### Apps/API (new + migrate from json-server)
- `apps/api/src/index.ts` - Server entry
- `apps/api/src/routers/` - tRPC routers
- `apps/api/src/services/` - Business logic

### Apps/WS (migrate from websocket-server)
- `apps/ws/src/index.ts` - WebSocket server

### Packages
- `packages/types/src/` - Shared types
- `packages/ui/src/` - Shared UI components
- `packages/trpc/src/` - tRPC definitions

---

## Verification Steps

### After Phase 1 (Core Refactor)
```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Start development
bun run dev

# Test web app loads
# Test API health endpoint
# Test WebSocket connection
```

### After Phase 2 (Auth)
- Test sign up flow (Email, Google, GitHub)
- Test sign in flow
- Verify protected routes work
- Check user data in Clerk dashboard

### After Phase 3 (Teams)
- Create organization
- Invite member
- Create project
- Share board within project
- Verify permissions

### After Phase 4 (Billing)
- Test checkout flow
- Verify webhook receives events
- Check subscription limits enforced
- Test upgrade/downgrade

---

## Environment Variables

```bash
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx

# Firebase
VITE_FIREBASE_CONFIG={"apiKey":"..."}

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_xxx

# OpenAI
OPENAI_API_KEY=sk_xxx

# Server URLs (Production)
VITE_API_URL=https://api.drawink.app
VITE_WS_URL=wss://ws.drawink.app
VITE_APP_URL=https://canvas.drawink.app
VITE_LANDING_URL=https://drawink.app
```

---

## Domain & Deployment Configuration

### Domains
- **Landing:** `drawink.app` (Vercel)
- **Web App:** `canvas.drawink.app` (Vercel)
- **API:** `api.drawink.app` (Cloud Run)
- **WebSocket:** `ws.drawink.app` (Cloud Run)
- **Docs:** `docs.drawink.app` (Vercel, internal)

### CI/CD (Basic)
- Auto-deploy on push to main branch
- Preview deployments for PRs
- Vercel handles web, landing, docs
- Cloud Run auto-deploy via Cloud Build

---

## Data Migration Strategy

### Preserve All Existing Data
1. **Collaboration rooms** (scenes collection) - Keep as-is
2. **Shareable links** (json-server data) - Migrate to new API
3. **User boards** (localStorage data) - Provide import tool
4. **Files** (Firebase Storage) - Keep as-is

### Migration Steps
1. Export current Firestore collections
2. Transform to new schema (add missing fields with defaults)
3. Import to new collections
4. Verify data integrity
5. Update app to use new schema
6. Keep old collections as backup for 30 days

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| SCSS to Tailwind migration breaks UI | Use Tailwind's @apply for complex styles initially |
| Clerk + Firebase integration issues | Test auth flow thoroughly, keep Firebase for data only |
| tRPC learning curve | Start with simple routers, add complexity gradually |
| Existing data compatibility | Create migration scripts, test with production data copy |
| Turborepo build issues | Start with simple pipeline, add caching later |

---

## Timeline Estimate (No Strict Deadline)

- **Phase 1:** 2-3 weeks (Foundation)
- **Phase 2:** 1 week (Auth)
- **Phase 3:** 1-2 weeks (Teams)
- **Phase 4:** 1-2 weeks (Billing)
- **Polish & Testing:** 1-2 weeks

**Total:** ~6-10 weeks for complete revamp

---

## Next Steps (After Plan Approval)

1. Initialize Turborepo structure
2. Set up biome.json
3. Create apps/ folder structure
4. Migrate web app first
5. Get dev server running
6. Then proceed with backend migration
