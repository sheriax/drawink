/**
 * Convex Authentication Configuration
 *
 * This configures Convex to accept JWT tokens from Clerk.
 * Requires a "convex" JWT template to be configured in Clerk Dashboard.
 *
 * Setup Instructions:
 * 1. Go to https://dashboard.clerk.com/
 * 2. Select your application
 * 3. Navigate to "JWT Templates" in the sidebar
 * 4. Create a new template and select "Convex" from the list
 * 5. The template name MUST be exactly "convex" (lowercase)
 * 6. Save the template
 *
 * Environment Variables Required:
 * - CLERK_JWT_ISSUER_DOMAIN: Your Clerk issuer domain (e.g., https://your-app.clerk.accounts.dev)
 *
 * NOTE: Auth is optional. If not configured, authentication features won't work,
 * but anonymous features (like public shareable links) will still function.
 */

const clerkDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

export default {
  providers: clerkDomain
    ? [
        {
          domain: clerkDomain,
          applicationID: "convex",
        },
      ]
    : [],
};
