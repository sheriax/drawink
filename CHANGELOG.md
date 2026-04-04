# Changelog

All notable app-level changes to Drawink are documented here.
For core drawing engine changes, see `src/core/CHANGELOG.md`.

## [Unreleased] - 2026-04-05

### Features

- **Workspace Invitations** — Email-based invitation flow using Resend
  - Invite users by email from the Members modal (team-tier workspaces)
  - Branded HTML invitation email sent via Resend API
  - Accept/decline page at `/invite/accept?token=...` with full auth handling
  - Pending invitations auto-applied when a new user signs up via Clerk webhook
  - Pending invitations banner on dashboard with accept/decline buttons
  - Workspace admins can view and revoke pending invitations in Members modal
  - 7-day token expiry, rate limiting (20 invites/hr), duplicate prevention

- **Shared Workspaces in Sidebar** — Visual distinction between owned and shared workspaces
  - Sidebar splits into "My Workspaces" and "Shared with me" sections
  - Shared workspaces have dashed border indicator
  - Context menu shows "View Members" and "Leave Workspace" for shared workspaces (instead of rename/delete)

- **Dashboard Dark Mode** — Full dark mode support for the dashboard
  - Dashboard now respects the app's `dark` class-based theme system
  - Theme toggle button added to DashboardNav (cycles: light / dark / system)
  - Syncs with homepage editor theme via shared `drawink-theme` localStorage key
  - Cross-tab sync via `storage` event listener
  - "A" badge indicator when system/auto mode is active

### Fixes

- **Dashboard blank page fix** — Validate stored `selectedWorkspaceId` against the user's actual workspace list before firing queries, preventing `Access denied` errors when a stale workspace ID exists in localStorage

### New Files

- `convex/invitations.ts` — Invitation mutations, queries, and internal helpers
- `convex/invitationEmail.ts` — Node.js action for sending emails via Resend
- `src/pages/InviteAcceptPage.tsx` — Invitation accept/decline page
- `src/pages/InviteAcceptPage.scss` — Styles for invite page (with dark mode)

### Modified Files

- `convex/schema.ts` — Added `workspaceInvitations` table
- `convex/http.ts` — Auto-apply pending invitations on `user.created` webhook
- `src/index.tsx` — Added `/invite/accept` route
- `src/pages/dashboard/Dashboard.scss` — Dark mode variables, theme button, invitation banner, shared workspace, and pending invitation styles
- `src/pages/dashboard/DashboardContent.tsx` — Workspace validation, pending invitations query/banner, accept/decline handlers
- `src/pages/dashboard/components/DashboardNav.tsx` — Theme toggle button with light/dark/system cycling
- `src/pages/dashboard/components/MembersModal.tsx` — Email invitation flow replacing direct-add, pending invitations section with revoke
- `src/pages/dashboard/components/WorkspaceSidebar.tsx` — Owned vs shared workspace grouping, role-aware context menus
