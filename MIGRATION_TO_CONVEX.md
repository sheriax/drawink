# Convex + Firebase Storage Migration Guide

**Status:** ✅ Foundation Complete
**Started:** January 26, 2026
**Architecture:** Hybrid (Convex for database, Firebase Storage for files)

---

## Why This Migration?

### Problems with Original Plan (Firebase Firestore + tRPC)
1. Complex architecture (3 separate servers)
2. Manual real-time subscription management
3. Bun runtime compatibility issues (gRPC)
4. Complex transaction logic for conflict resolution

### Why Convex + Firebase Storage Hybrid?
1. **Simpler architecture** - One backend (Convex) vs three servers
2. **Better TypeScript DX** - Generated types, reactive queries
3. **Built-in real-time** - No manual Socket.IO management
4. **ACID transactions** - Default, not manual
5. **Cost-effective files** - Firebase Storage 19x cheaper ($0.026/GB vs $0.50/GB)
6. **Keep what works** - No need to migrate 5GB+ of existing files

---

## Architecture Comparison

### BEFORE (Original Plan)
```
┌─────────────────────────────────────────┐
│              Frontend (Vite)             │
│                                          │
│  ┌────────────┐  ┌───────────────────┐ │
│  │ tRPC Client│  │ Socket.IO Client  │ │
│  └────────────┘  └───────────────────┘ │
└─────────────────────────────────────────┘
        ↓                    ↓
┌────────────────┐    ┌──────────────────┐
│  tRPC + Hono   │    │  Socket.IO       │
│  API Server    │    │  WebSocket       │
│  (Cloud Run)   │    │  (Cloud Run)     │
└────────────────┘    └──────────────────┘
        ↓                    ↓
┌──────────────────────────────────────────┐
│        Firebase Firestore                │
│        + Firebase Storage                │
└──────────────────────────────────────────┘
```

### AFTER (Convex Hybrid)
```
┌─────────────────────────────────────────┐
│              Frontend (Vite)             │
│                                          │
│  ┌────────────┐  ┌───────────────────┐ │
│  │  Convex    │  │ Firebase Storage  │ │
│  │  Client    │  │  Client           │ │
│  │ (useQuery) │  │  (uploadFile)     │ │
│  └────────────┘  └───────────────────┘ │
└─────────────────────────────────────────┘
        ↓                    ↓
┌────────────────┐    ┌──────────────────┐
│     Convex     │    │ Firebase Storage │
│  - Database    │    │                  │
│  - Functions   │    │  - Images        │
│  - Real-time   │    │  - Thumbnails    │
│  - Auth (Clerk)│    │  - Assets        │
└────────────────┘    └──────────────────┘
```

**Eliminated:** tRPC server, WebSocket server, complex Firestore logic

---

## What's Been Built (✅ Complete)

### 1. Convex Schema (`convex/schema.ts`)
- ✅ Users (synced from Clerk)
- ✅ Workspaces
- ✅ Workspace Members
- ✅ Projects (folders)
- ✅ Boards
- ✅ Board Collaborators
- ✅ Board Content (encrypted)
- ✅ Board Versions
- ✅ Files (metadata only - actual files in Firebase)
- ✅ Templates
- ✅ Collaboration Sessions (real-time presence)
- ✅ AI Usage Tracking
- ✅ Conflict Logs

### 2. Convex Functions
- ✅ `boards.ts` - Board CRUD + content save/load
- ✅ `workspaces.ts` - Workspace management
- ✅ `files.ts` - File metadata (Firebase URLs)
- ✅ `users.ts` - User sync from Clerk

### 3. Firebase Storage Integration
- ✅ `src/lib/firebaseStorage.ts` - Upload/download helpers
- ✅ Hybrid pattern: Files in Firebase, metadata in Convex
- ✅ Cost optimization (19x cheaper storage)

### 4. Authentication
- ✅ `src/lib/convex.tsx` - Clerk + Convex provider
- ✅ Seamless auth integration

### 5. Configuration
- ✅ `convex/convex.json` - Convex config
- ✅ `.env.example` - Environment variables
- ✅ `package.json` - Scripts updated

---

## How to Use

### 1. Install Dependencies
```bash
cd apps/web
bun install
```

### 2. Set Up Convex Project
```bash
# Login to Convex (first time only)
bunx convex login

# Initialize project (creates deployment)
bunx convex dev

# This will:
# - Create a new Convex deployment
# - Generate VITE_CONVEX_URL for you
# - Start watching for schema changes
```

### 3. Configure Environment Variables
```bash
# Copy example env file
cp .env.example .env.local

# Add your keys:
# - VITE_CONVEX_URL (from step 2)
# - VITE_CLERK_PUBLISHABLE_KEY
# - VITE_APP_FIREBASE_CONFIG (for Storage only)
```

### 4. Run Development Server
```bash
# This runs both Convex dev + Vite dev server
bun run dev

# Or run separately:
bun run dev:convex  # Convex backend
bun run dev:vite    # Frontend
```

---

## Usage Examples

### Example 1: Create a Board

```typescript
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function CreateBoardButton() {
  const createBoard = useMutation(api.boards.create);
  const workspaces = useQuery(api.workspaces.listMine);

  const handleCreate = async () => {
    if (!workspaces || workspaces.length === 0) return;

    const boardId = await createBoard({
      workspaceId: workspaces[0]._id,
      name: "My New Board",
    });

    console.log("Created board:", boardId);
  };

  return <button onClick={handleCreate}>Create Board</button>;
}
```

### Example 2: List Boards (Real-time!)

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function BoardsList({ workspaceId }) {
  // This is REACTIVE - updates automatically when data changes!
  const boards = useQuery(api.boards.listByWorkspace, { workspaceId });

  if (!boards) return <div>Loading...</div>;

  return (
    <ul>
      {boards.map((board) => (
        <li key={board._id}>{board.name}</li>
      ))}
    </ul>
  );
}
```

### Example 3: Upload Image with Metadata

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { uploadFileWithMetadata } from "../lib/firebaseStorage";

function ImageUploader({ boardId }) {
  const createFile = useMutation(api.files.create);

  const handleUpload = async (file: File) => {
    // Upload to Firebase Storage + save metadata to Convex
    const result = await uploadFileWithMetadata(
      file,
      boardId,
      createFile // Pass Convex mutation
    );

    console.log("Uploaded:", result.fileId, result.url);
  };

  return <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />;
}
```

### Example 4: Save Board Content (Encrypted)

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function SaveBoardButton({ boardId, elements, appState }) {
  const saveContent = useMutation(api.boards.saveContent);

  const handleSave = async () => {
    // Encrypt content
    const data = { elements, appState };
    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(json);

    // Simple encryption (use proper crypto in production)
    const key = await deriveKey(userId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      plaintext
    );

    // Calculate checksum
    const checksum = await sha256(json);

    // Save to Convex
    const version = await saveContent({
      boardId,
      ciphertext: new Uint8Array(ciphertext),
      iv,
      checksum,
    });

    console.log("Saved version:", version);
  };

  return <button onClick={handleSave}>Save</button>;
}
```

---

## Migration Checklist

### Phase 1: Foundation (✅ COMPLETE)
- [x] Install Convex
- [x] Create schema
- [x] Create basic queries/mutations
- [x] Set up Firebase Storage helpers
- [x] Configure Clerk auth

### Phase 2: Data Migration (🚧 IN PROGRESS)
- [ ] Create migration script (Firestore → Convex)
- [ ] Migrate users
- [ ] Migrate boards
- [ ] Migrate board content
- [ ] Test data integrity

### Phase 3: Frontend Updates (⏳ TODO)
- [ ] Replace Firestore hooks with Convex hooks
- [ ] Update file upload components
- [ ] Update board list components
- [ ] Update board editor
- [ ] Test real-time updates

### Phase 4: Cleanup (⏳ TODO)
- [ ] Remove old Firestore code
- [ ] Delete tRPC server code
- [ ] Delete WebSocket server code
- [ ] Update deployment config
- [ ] Update documentation

---

## Cost Comparison

### Storage Costs (for 10GB of files)

| Provider | Monthly Cost | Free Tier | Annual Cost |
|----------|--------------|-----------|-------------|
| **Firebase Storage** | **$0.26** | 5GB | **$3.12** |
| Convex File Storage | $5.00 | 0.5GB | $60.00 |
| **Savings** | **$4.74/month** | 10x more free | **$56.88/year** |

### At Scale (100GB of files)

| Provider | Monthly Cost | Annual Cost |
|----------|--------------|-------------|
| **Firebase Storage** | **$2.60** | **$31.20** |
| Convex File Storage | $50.00 | $600.00 |
| **Savings** | **$47.40/month** | **$568.80/year** |

**Conclusion:** Firebase Storage is 19x cheaper for file storage!

---

## Troubleshooting

### Error: "Cannot find module 'convex'"
```bash
bun add convex convex-helpers
```

### Error: "VITE_CONVEX_URL is not defined"
```bash
# Run convex dev first to get your URL
bunx convex dev
# Copy the URL to .env.local
```

### Error: "Unauthorized" in queries
```bash
# Make sure Clerk is configured
# Check VITE_CLERK_PUBLISHABLE_KEY in .env.local
```

### Firebase Storage 403 Error
```bash
# Check Firebase Storage rules
# Make sure bucket name is correct in VITE_APP_FIREBASE_CONFIG
```

---

## Next Steps

1. **Create Migration Script** - Migrate existing Firestore data to Convex
2. **Update Components** - Replace old Firestore code with Convex hooks
3. **Test Real-time** - Verify reactive queries work as expected
4. **Deploy to Production** - Deploy Convex + update frontend

---

## Resources

- [Convex Docs](https://docs.convex.dev)
- [Convex + Clerk Guide](https://docs.convex.dev/auth/clerk)
- [Firebase Storage Docs](https://firebase.google.com/docs/storage)
- [Hybrid Architecture Article](https://medium.com/@mustafakendiguzel/how-to-implement-firebase-cloud-storage-to-convex-28b9b2ddbd90)

---

**Questions? Issues?**
Check the [Convex Discord](https://discord.gg/convex) or [GitHub Issues](https://github.com/drawink/drawink/issues)
