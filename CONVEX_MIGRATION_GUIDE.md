# Convex Migration Guide

## Current Status ✅

Phase 1 (Foundation) is **COMPLETE**:

- ✅ Convex project configured (`convex/` directory)
- ✅ Database schema defined (12 tables)
- ✅ Backend functions created (boards, workspaces, files, users)
- ✅ Firebase Storage helpers ready (hybrid architecture)
- ✅ Convex provider integrated into React app
- ✅ Environment variables configured
- ✅ TypeScript errors fixed
- ✅ Example components created

## Architecture Overview

### Hybrid Approach: Convex + Firebase Storage

```
┌─────────────────────────────────────────┐
│         React Application               │
│  ┌───────────────────────────────────┐  │
│  │    Convex Hooks (useQuery, etc)   │  │
│  └───────────────────────────────────┘  │
│              ↓                           │
│  ┌───────────────────────────────────┐  │
│  │    ConvexClientProvider           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
          ↓                      ↓
  ┌──────────────┐      ┌────────────────┐
  │   Convex DB  │      │ Firebase       │
  │   (Data)     │      │ Storage (Files)│
  └──────────────┘      └────────────────┘
```

**What goes where:**
- **Convex**: All database data (boards, users, metadata, relationships)
- **Firebase Storage**: All files (images, thumbnails, exports) - 19x cheaper!

## Phase 2: Component Migration (Next Steps)

### Step 1: Identify Components Using Firestore

Search for these patterns in your codebase:

```bash
# Find Firestore imports
grep -r "firebase/firestore" apps/web/src/

# Find Firestore hooks
grep -r "useDocument\|useCollection" apps/web/src/

# Find direct Firestore calls
grep -r "db.collection\|getDoc\|setDoc" apps/web/src/
```

### Step 2: Migration Pattern

For each component using Firestore:

#### Before (Firestore):
```typescript
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const boardRef = doc(db, "boards", boardId);
const boardSnap = await getDoc(boardRef);
const board = boardSnap.data();

// Real-time listener
const unsubscribe = onSnapshot(boardRef, (doc) => {
  setBoard(doc.data());
});
```

#### After (Convex):
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

// Real-time query (automatic updates!)
const board = useQuery(api.boards.get, { boardId });

// Mutation
const updateBoard = useMutation(api.boards.update);
await updateBoard({ boardId, name: "New Name" });
```

### Step 3: File Upload Migration

File uploads use the **hybrid pattern**:

#### Before (Firestore + Storage):
```typescript
// Upload file
const fileRef = ref(storage, `boards/${boardId}/file.png`);
await uploadBytes(fileRef, file);
const url = await getDownloadURL(fileRef);

// Save URL to Firestore
await setDoc(doc(db, "files", fileId), {
  url,
  boardId,
  createdAt: serverTimestamp(),
});
```

#### After (Convex + Firebase Storage):
```typescript
import { uploadImage } from "./lib/firebaseStorage";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

// Upload to Firebase Storage (keep existing)
const fileId = crypto.randomUUID();
const { url, path } = await uploadImage(file, { boardId, fileId });

// Save metadata to Convex (new)
const createFile = useMutation(api.files.create);
await createFile({
  boardId,
  fileId,
  firebaseStorageUrl: url,
  firebaseStoragePath: path,
  mimeType: file.type,
  sizeBytes: file.size,
});
```

## Key Files to Update

### High Priority (Core Features)

1. **Dashboard Component** (`src/pages/Dashboard.tsx`)
   - Replace Firestore queries with Convex
   - Use `useQuery(api.boards.listByWorkspace)`
   - Use `useQuery(api.workspaces.listMine)`

2. **Board Creation** (wherever boards are created)
   - Replace `setDoc` with `useMutation(api.boards.create)`

3. **Board Loading** (wherever boards are loaded)
   - Replace `getDoc` with `useQuery(api.boards.get)`

4. **Collaboration** (`src/collab/Collab.tsx`)
   - Update to use Convex real-time queries
   - Replace Firestore listeners with `useQuery`

5. **File Upload Components**
   - Keep Firebase Storage upload code
   - Add Convex metadata save

### Medium Priority (Settings & Management)

6. **User Profile** (if exists)
   - Use `useQuery(api.users.getCurrent)`

7. **Workspace Management**
   - Use `useQuery(api.workspaces.listMine)`
   - Use `useMutation(api.workspaces.create)`

8. **Board Settings**
   - Use `useMutation(api.boards.update)`
   - Use `useMutation(api.boards.softDelete)`

### Low Priority (Can Keep Firestore Temporarily)

9. **Analytics** (if using Firestore)
   - Can migrate later or keep in Firestore

10. **Logs** (if using Firestore)
    - Can migrate later

## Available Convex Functions

### Boards (`api.boards.*`)
- `get` - Get single board by ID
- `listByWorkspace` - List all boards in workspace
- `create` - Create new board
- `update` - Update board (name, isPublic, etc)
- `saveContent` - Save encrypted board content
- `getContent` - Get board content
- `softDelete` - Archive board
- `addCollaborator` - Add user to board
- `removeCollaborator` - Remove user from board

### Workspaces (`api.workspaces.*`)
- `get` - Get single workspace
- `listMine` - List user's workspaces (owned + member)
- `create` - Create new workspace
- `update` - Update workspace
- `ensureDefault` - Ensure user has default workspace

### Files (`api.files.*`)
- `create` - Save file metadata (after Firebase upload)
- `listByBoard` - List files for board
- `delete` - Delete file metadata

### Users (`api.users.*`)
- `getCurrent` - Get current user (from Clerk)
- `syncFromClerk` - Sync user from Clerk (webhook)
- `getById` - Get user by Clerk ID

## Data Migration Script

A migration script is needed to copy existing data from Firestore to Convex.

**Location**: `apps/web/src/scripts/migrateFirestoreToConvex.ts` (to be created)

**Steps**:
1. Connect to both Firestore and Convex
2. Fetch all collections from Firestore
3. Transform data to match Convex schema
4. Insert into Convex using mutations
5. Verify data integrity
6. Update file URLs (Firebase Storage paths stay the same)

## Testing Strategy

### Step 1: Parallel Running (Recommended)
1. Keep Firestore code
2. Add Convex code alongside
3. Write to both databases temporarily
4. Compare results
5. Switch reads to Convex
6. Remove Firestore writes
7. Remove Firestore code

### Step 2: Feature Flags
```typescript
const USE_CONVEX = import.meta.env.VITE_USE_CONVEX === "true";

const board = USE_CONVEX
  ? useQuery(api.boards.get, { boardId })
  : useFirestoreBoard(boardId);
```

### Step 3: Gradual Rollout
- Start with new boards (created after migration)
- Migrate old boards in batches
- Monitor for issues
- Roll back if needed

## Benefits After Migration

1. **Simpler Code**
   - No manual real-time listener setup
   - No transaction complexity
   - Automatic type generation

2. **Better Performance**
   - Faster queries (optimized indexes)
   - Built-in caching
   - Automatic query optimization

3. **Real-time by Default**
   - All queries are reactive
   - Automatic component updates
   - No listener management

4. **Type Safety**
   - Full TypeScript support
   - Auto-generated types from schema
   - Compile-time error checking

5. **Cost Savings**
   - Files in Firebase Storage (cheap)
   - Data in Convex (optimized)
   - No WebSocket server needed
   - No tRPC API server needed

## Rollback Plan

If migration issues occur:

1. **Immediate**: Revert to previous git commit
2. **Partial**: Use feature flag to disable Convex
3. **Full**: Remove Convex provider, restore Firestore code

**Important**: Keep Firestore code until migration is 100% complete and tested.

## Questions?

- **Convex Docs**: https://docs.convex.dev
- **Examples**: See `src/examples/ConvexUsageExample.tsx`
- **Schema**: See `convex/schema.ts`
- **Functions**: See `convex/boards.ts`, `convex/workspaces.ts`, etc.

## Phase 3: Core Migration (COMPLETED ✅)

### ✅ Data Migration Script Created
**Location:** `src/scripts/migrateFirestoreToConvex.ts`

**Features:**
- Migrates workspaces, boards, and encrypted board content
- Dry-run mode available (`--dry-run` flag)
- Detailed logging and error tracking
- Migration statistics report
- READ-ONLY on Firestore (safe, doesn't delete anything)

**Usage:**
```bash
# Dry run (no changes)
bun run src/scripts/migrateFirestoreToConvex.ts --dry-run

# Actual migration
bun run src/scripts/migrateFirestoreToConvex.ts
```

**What it does:**
1. Connects to both Firestore and Convex
2. Fetches all workspaces and boards from Firestore
3. Copies data to Convex with proper transformations
4. Migrates encrypted board content (ciphertext + IV)
5. Generates detailed migration report with statistics

### ✅ Dashboard Component Updated
**Location:** `src/pages/Dashboard.tsx`

**Changes:**
- ❌ Removed: localStorage board loading (temporary)
- ❌ Removed: Manual board fetching logic
- ✅ Added: Convex real-time queries (`useQuery`)
- ✅ Added: Convex mutations (`useMutation`)
- ✅ Added: Automatic workspace management
- ✅ Added: Real-time board list updates

**Before:**
```typescript
// Manual localStorage loading
const boards = loadBoardsFromLocalStorage();
setRecentBoards(boards);
```

**After:**
```typescript
// Real-time Convex queries
const workspaces = useQuery(api.workspaces.listMine);
const recentBoards = useQuery(api.boards.listByWorkspace, { workspaceId });
const createBoard = useMutation(api.boards.create);
```

**Benefits:**
- ⚡ Real-time updates (boards appear instantly across tabs)
- 🔄 No manual refresh needed
- 🎯 Type-safe queries with auto-generated types
- 📦 Automatic workspace creation for new users

### ✅ ConvexStorageAdapter Created
**Location:** `src/data/ConvexStorageAdapter.ts`

**Purpose:** Drop-in replacement for `CloudStorageAdapter` that uses Convex instead of Firestore.

**Features:**
- Implements same `StorageAdapter` interface
- End-to-end encryption (PBKDF2 + AES-GCM)
- Workspace management
- Board CRUD operations
- Encrypted board content storage
- SHA-256 checksums for conflict detection

**Migration Path:**
```typescript
// OLD (Firestore)
const adapter = new CloudStorageAdapter(userId);

// NEW (Convex)
const adapter = new ConvexStorageAdapter(userId, convexUrl);

// Same interface, zero code changes!
await adapter.getBoards();
await adapter.createBoard("My Board");
await adapter.saveBoardContent(boardId, content);
```

**Hybrid Architecture:**
- ✅ Board metadata → Convex (real-time reactive)
- ✅ Board content (encrypted) → Convex
- ✅ Files (images, thumbnails) → Firebase Storage (19x cheaper!)

## Next Actions

1. ✅ Review this guide
2. ✅ Create data migration script
3. ✅ Update Dashboard component (high priority)
4. ✅ Update board creation/loading (high priority)
5. ⏳ Run migration script with dry-run
6. ⏳ Run actual migration script
7. ⏳ Test with real data (verify all boards load)
8. ⏳ Update remaining components to use ConvexStorageAdapter
9. ⏳ Gradually migrate remaining components
10. ⏳ Remove Firestore code (after 100% migrated)
11. ⏳ Update documentation
12. ⏳ Remove old API server (`apps/api/`)
13. ⏳ Remove WebSocket server (`apps/ws/`)
