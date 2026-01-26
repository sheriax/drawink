# Clerk + Convex Setup Instructions

## Issue
When logging in, you get a 404 error:
```
POST https://loyal-vervet-3.clerk.accounts.dev/v1/client/sessions/.../tokens/convex
404 (Not Found)
```

## Fix: Configure Clerk JWT Template

### Step 1: Go to Clerk Dashboard
1. Open: https://dashboard.clerk.com/
2. Select your application: `loyal-vervet-3`

### Step 2: Create Convex JWT Template
1. In the sidebar, go to **JWT Templates**
2. Click **New template**
3. Select **Convex** from the list of templates
4. The template will be auto-configured with:
   - **Name:** `convex` (this must match exactly!)
   - **Claims:** Pre-configured for Convex

### Step 3: Save
1. Click **Create** or **Save**
2. That's it! No code changes needed.

### Verification
After creating the template, restart your dev server:
```bash
npm run dev
```

Try logging in again. The 404 error should be gone.

## Additional Notes
- The JWT template name MUST be exactly "convex" (lowercase)
- This allows Clerk to issue tokens that Convex can verify
- Convex uses these tokens to authenticate your users

