# Firestore Authentication Issue & Solution

## Problem

Your app uses **Clerk** for user authentication, but **Firebase Firestore** expects **Firebase Auth** tokens. This causes permission errors:

```
FirebaseError: Missing or insufficient permissions
Error: No workspace selected
```

**Root Cause:** When you sign in with Clerk (youhanasheriff@gmail.com), Firestore security rules check `request.auth.uid`, but Clerk doesn't authenticate with Firebase Auth, so `request.auth` is null and access is denied.

## Quick Fix: Update Firestore Rules (Development Only)

I've updated [firebase-project/firestore.rules](firebase-project/firestore.rules) to temporarily allow all operations. Now you need to deploy these rules:

### Option 1: Deploy via Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **drawink-2026**
3. Navigate to **Firestore Database** → **Rules** tab
4. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing scenes collection for real-time collaboration
    match /scenes/{roomId} {
      allow get, write: if true;
      allow list: if false;
    }

    // TEMPORARY: Allow all operations for development
    // TODO: Integrate Clerk with Firebase Auth for proper security
    match /workspaces/{workspaceId} {
      allow read, write: if true;

      match /boards/{boardId} {
        allow read, write: if true;

        match /content/{contentId} {
          allow read, write: if true;
        }
      }
    }
  }
}
```

5. Click **Publish**

### Option 2: Deploy via Firebase CLI

```bash
# Login to Firebase
firebase login --reauth

# Deploy rules
cd firebase-project
firebase deploy --only firestore:rules
```

## Verification

After deploying, refresh your app. The errors should disappear and you should see:

```
✅ [SyncEngine] Starting...
✅ [HybridStorageAdapter] Cloud sync enabled for user: user_XXX
✅ [Auth] User signed in: youhanasheriff@gmail.com
✅ [SyncEngine] Initial pull completed
✅ [SyncEngine] Started (no periodic sync)
```

## Long-Term Solutions

### Option 1: Integrate Clerk with Firebase Auth (Recommended)

Set up Clerk to generate Firebase custom tokens:

1. **In Clerk Dashboard:**
   - Go to **JWT Templates**
   - Create a new **Firebase** template
   - Add custom claims: `user_id`, `email`

2. **In your app ([App.tsx](apps/web/src/App.tsx)):**

```typescript
import { useAuth } from '@clerk/clerk-react';
import { signInWithCustomToken } from 'firebase/auth';
import { firebaseAuth } from './data/firebase';

function App() {
  const { getToken } = useAuth();

  useEffect(() => {
    const syncClerkWithFirebase = async () => {
      // Get Firebase token from Clerk
      const token = await getToken({ template: 'firebase' });

      if (token) {
        // Sign in to Firebase with Clerk's custom token
        const auth = firebaseAuth.getAuth();
        await signInWithCustomToken(auth, token);
        console.log('[Firebase] Authenticated via Clerk');
      }
    };

    syncClerkWithFirebase();
  }, [getToken]);

  // ... rest of your app
}
```

3. **Restore production Firestore rules:**

Use the commented-out rules in [firestore.rules](firebase-project/firestore.rules#L35-L46) that check `request.auth.uid`.

**Benefits:**
- ✅ Keep Clerk's UI/UX
- ✅ Secure Firestore access
- ✅ Single source of truth for user identity

**Drawbacks:**
- ⚠️ Requires Clerk Pro plan for custom JWT templates
- ⚠️ Additional complexity

### Option 2: Switch to Firebase Auth Only

Remove Clerk entirely and use Firebase Auth:

1. **Update [index.tsx](apps/web/src/index.tsx):**

```diff
- import { ClerkProvider } from "@clerk/clerk-react";
+ import { firebaseAuth } from "./data/firebase";

root.render(
  <StrictMode>
-   <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Routes>
-         <Route path="/sign-in/*" element={<SignIn />} />
-         <Route path="/sign-up/*" element={<SignUp />} />
+         <Route path="/sign-in" element={<FirebaseSignIn />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/*" element={<DrawinkApp />} />
        </Routes>
      </BrowserRouter>
-   </ClerkProvider>
  </StrictMode>
);
```

2. **Create Firebase sign-in component:**

```typescript
// components/FirebaseSignIn.tsx
import { firebaseAuth } from '../data/firebase';

function FirebaseSignIn() {
  const handleGoogleSignIn = async () => {
    try {
      await firebaseAuth.signInWithGoogle();
      // User is now authenticated with Firebase
    } catch (error) {
      console.error('Sign-in failed:', error);
    }
  };

  return (
    <button onClick={handleGoogleSignIn}>
      Sign in with Google
    </button>
  );
}
```

3. **Update [CloudStorageAdapter.ts](apps/web/src/data/CloudStorageAdapter.ts):**

```typescript
// Use Firebase Auth user ID directly
const firebaseUser = firebaseAuth.getCurrentUser();
if (firebaseUser) {
  const adapter = new CloudStorageAdapter(firebaseUser.uid);
}
```

**Benefits:**
- ✅ Simpler architecture
- ✅ No additional service (Clerk)
- ✅ Direct Firebase integration
- ✅ No custom JWT setup needed

**Drawbacks:**
- ⚠️ Lose Clerk's nice UI components
- ⚠️ Need to build auth UI from scratch
- ⚠️ Migration effort for existing Clerk users

## Current Architecture

```
┌─────────────────┐
│  Clerk Auth     │  ← User signs in here
│  (Active)       │
└─────────────────┘
        ↓
  user_38lj...     ← Clerk user ID

┌─────────────────┐
│ Firebase Auth   │  ← Firestore expects auth here
│  (Not used!)    │
└─────────────────┘
        ↓
  request.auth = null  ← Permission denied!
```

## Target Architecture (Option 1)

```
┌─────────────────┐
│  Clerk Auth     │  ← User signs in here
│  (Active)       │
└────────┬────────┘
         │ Custom JWT
         ↓
┌─────────────────┐
│ Firebase Auth   │  ← Authenticate with Clerk token
│  (Active)       │
└────────┬────────┘
         │ request.auth.uid
         ↓
   Permission granted! ✅
```

## Security Warning

The temporary rules (`allow read, write: if true`) have **NO SECURITY**. Anyone with your Firestore URL can read/write data.

**DO NOT use in production.**

Deploy proper authentication before going live.

## Next Steps

1. **Immediate:** Deploy temporary rules (see "Quick Fix" above)
2. **This week:** Choose long-term solution (Option 1 or 2)
3. **Before production:** Implement chosen solution and restore security rules

---

**Questions?** Check the implementation in:
- [CloudStorageAdapter.ts:186](apps/web/src/data/CloudStorageAdapter.ts#L186) - Where permissions fail
- [firebase.ts:77-157](apps/web/src/data/firebase.ts#L77-L157) - Firebase Auth API
- [firestore.rules:10-33](firebase-project/firestore.rules#L10-L33) - Security rules
