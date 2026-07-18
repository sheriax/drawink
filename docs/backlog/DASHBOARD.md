# Dashboard feature backlog

Status: **Deferred**  
Inventory captured: **2026-07-18**  
Historical source: deleted `feature/dashboard` branch at `19fcc539`

This document preserves the product scope explored on the historical dashboard
branch so the features can be reimplemented later. It is a requirements
inventory, not an implementation guide: the branch was based on architecture
that predates the Convex-only migration and was not safe to merge.

## Product goal

Provide signed-in users with a central dashboard for navigating workspaces,
organizing boards, collaborating with members, and starting work from reusable
templates without entering the canvas first.

## Preserved feature inventory

### Dashboard shell and navigation

- Authenticated `/dashboard` route with redirect to Clerk sign-in.
- Top navigation with user identity and a return-to-canvas action.
- Responsive workspace sidebar and main content area.
- Loading, empty, error, confirmation, and upgrade-prompt states.
- Keyboard shortcuts for creating a board, focusing search, and closing overlays.
- Display of cloud synchronization status.

### Theme support

- Light, dark, and system theme modes.
- Shared `drawink-theme` browser preference with the canvas.
- System color-scheme updates while the dashboard is open.
- Cross-tab theme synchronization through the browser `storage` event.

### Workspace management

- List workspaces owned by the current user.
- Separate "Shared with me" section for membership-based workspaces.
- Create, rename, customize, and delete owned workspaces.
- Workspace icon and color pickers.
- Member-count display.
- Role-aware workspace menus.
- View members and leave a shared workspace.
- Validate a persisted workspace selection before starting workspace queries.

### Member administration and invitations

- Members modal showing names, emails, avatars, and roles.
- Owner controls for changing roles and removing members.
- Email invitations with `admin`, `member`, or `viewer` roles.
- Branded invitation email delivery through Resend.
- Authenticated `/invite/accept?token=...` accept/decline page.
- Pending-invitation banner on the dashboard.
- Pending invitation listing and revocation for workspace administrators.
- Seven-day token expiry, duplicate detection, and invitation rate limits.
- Optional application of matching pending invitations after a Clerk signup.

### Board browsing and management

- Grid and list display modes with persisted preference.
- Search by board name.
- Sort by name, creation time, or last-opened time.
- Recently opened boards section.
- Board thumbnails and formatted activity dates.
- Favorite/star toggle per user.
- Active collaborator avatars.
- Create and open a blank board.
- Rename, duplicate, archive, restore, and permanently delete a board.
- Move a board into or out of a project.
- Confirmation before destructive operations.

### Projects

- Project folders within a workspace.
- Create, rename, and delete projects.
- Project icon and color customization.
- Board count per project.
- Project breadcrumb navigation.
- Drag a board onto a project folder to move it.
- Move boards to the workspace root when deleting a project.

### Templates

- Template picker with built-in and workspace templates.
- Category browsing and usage counts.
- Create a board from a template.
- Save an existing board as a reusable workspace template.
- Template name, description, and category fields.
- Delete user-created templates with confirmation.
- Preload newly created board content before opening the canvas.

### Subscription presentation

- Free, Pro, and Team feature indicators.
- Board-count display for the free tier.
- Upgrade prompts for paid dashboard features.
- AI usage meter and navigation to billing.

## Backend concepts to retain

- `workspaceInvitations` records with token, recipient, role, state, expiry, and
  inviter metadata.
- `boardStars` records scoped to a board and user.
- Workspace-scoped projects and templates.
- Indexed recent-board queries.
- Batched active-presence lookup for visible boards.
- Clerk webhook integration for user synchronization and invitation handling.
- Scheduled email delivery through an internal Convex action.

## Requirements before reimplementation

The historical code must not be copied directly. A replacement must satisfy all
of the following:

1. Build on current `master`, Bun, Convex database/realtime/storage, Clerk, and
   Vercel. Do not restore Firebase, Google Cloud, Socket.IO, the standalone
   collaboration server, or the removed pnpm lockfile.
2. Define one server-side authorization helper for workspace and board roles.
   A `viewer` must never pass an editor or administrator check.
3. Enforce subscription entitlements and quotas inside Convex mutations. UI
   hiding is presentation only and cannot be the enforcement boundary.
4. Validate every workspace, project, board, template, and presence identifier
   against the caller's tenant and role. Reject cross-workspace relationships.
5. Design shared-content encryption before implementing templates or shared
   boards. Ciphertext cannot be copied between users when keys are derived per
   user; use a reviewed workspace/template key design and migration plan.
6. Keep private template metadata and content scoped to authorized workspace
   members. Built-in templates need a separately defined trust and key model.
7. Escape all user-controlled values inserted into invitation HTML, verify the
   intended recipient for accept and decline operations, and rate-limit actual
   send attempts with a non-bypassable policy.
8. Update `lastOpenedAt` on a successful board open and include authorized shared
   boards in recent results.
9. Cascade or explicitly retain related stars, invitations, templates, projects,
   files, sessions, and content when deleting boards or workspaces. Add the
   indexes required for bounded cleanup.
10. Add explicit argument and return validators to every public Convex function,
    bound arrays and text lengths, and avoid unindexed table scans.
11. Add backend authorization tests for owner, admin, member, viewer, outsider,
    and anonymous callers, plus UI tests for the primary dashboard workflows.
12. Pass the frozen install, zero-vulnerability audit, Biome, TypeScript, test,
    production build, and Vercel preview gates before merge.

## Suggested delivery slices

1. Read-only dashboard shell, workspace selection, board search/sort, and recent
   board tracking.
2. Secure board actions, stars, archive, and project organization.
3. Workspace membership and role-aware member administration.
4. Hardened invitation delivery and acceptance lifecycle.
5. Shared-key design followed by custom and built-in templates.
6. Subscription enforcement, usage presentation, accessibility, responsive QA,
   and full end-to-end coverage.

## Historical commits

- `31cfe00f` — dashboard, board management, projects, members, invitations, and
  supporting Convex functions.
- `2fed9aeb` — invitation sender address adjustment.
- `19fcc539` — save-as-template, template deletion, and template board creation.
