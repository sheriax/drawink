# Fix Workbox Verbose Logging

## Problem
Workbox service worker is logging hundreds of cache messages, cluttering the console.

## Root Cause
A service worker was previously registered and is still active, even though `VITE_APP_ENABLE_PWA=false` in development.

## Solution: Unregister the Service Worker

### Option 1: Browser DevTools (Immediate)

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in the left sidebar
4. Find the service worker for `localhost:3000`
5. Click **Unregister**
6. **Hard refresh** the page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Option 2: Clear All Site Data (Nuclear Option)

1. Chrome DevTools → Application tab
2. Under "Storage" section, click **Clear site data**
3. Check all boxes
4. Click **Clear site data**
5. Hard refresh the page

### Option 3: Add to .env.local to Prevent Re-registration

Edit `apps/web/.env.local` and change:
```diff
- VITE_APP_DISABLE_PWA=false
+ VITE_APP_DISABLE_PWA=true
```

This completely disables the PWA plugin during development.

## Verify It's Fixed

After unregistering, refresh the page. You should see:
- ❌ No more "workbox Router is responding to..." messages
- ✅ Clean console with only your app logs

## If You DO Want PWA in Development

If you actually need to test the service worker during development:

Edit `.env.development` (or create `.env.development.local`):
```diff
- VITE_APP_ENABLE_PWA=false
+ VITE_APP_ENABLE_PWA=true
```

And reduce logging verbosity by updating [vite.config.mts](apps/web/vite.config.mts):

```typescript
workbox: {
  // ... existing config
  navigateFallback: undefined, // Reduce navigation logging
  cleanupOutdatedCaches: true,
  sourcemap: false, // Disable sourcemaps for workbox
}
```

## Prevention

Add this to your `.gitignore`:
```
.env.local
.env.development.local
```

This ensures local PWA settings don't get committed.
