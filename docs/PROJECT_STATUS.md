# Project status and improvement register

Audit updated: **2026-07-18**

This register separates implemented repository changes from production cutover,
security decisions, and incomplete product surfaces. “Implemented” does not mean
“live” until the deployment and smoke-test evidence exists.

## Executive status

| Area | Status | Evidence or remaining work |
| --- | --- | --- |
| Convex-only production | Live | PR #16 (`56806206`) deployed the Convex realtime/storage frontend and backend on 2026-07-18 |
| Legacy data and identity migration | Complete | Google application data passed byte verification; 3 Firebase users moved to Clerk; 2 owners were relinked and 1 orphan was preserved |
| Legacy project shutdown | Complete | `drawink-2026` has billing disabled and lifecycle `DELETE_REQUESTED` |
| Quality baseline | Passed | Frozen install, zero-vulnerability audit, Biome, TypeScript, 586 passing tests (9 skipped), and production/PWA build passed on 2026-07-18; CI remains a PR gate |
| Documentation | Reorganized | Architecture, development, deployment, retirement, and status scopes are explicit |
| Credential exposure | One external P0 remains | The Google key/secret incident is resolved; the previously tracked AI provider key still requires rotation and history cleanup |
| Production protections | Partially configured | CI/deploy gates exist; repository/environment protection settings need administrator verification |

## Implemented in the Convex migration

- Replaced the standalone realtime process with a Convex reactive-query adapter
  while preserving the editor's event contract.
- Bound realtime sessions to one-way room-key proofs and added identifier,
  payload-size, channel, and per-session rate checks.
- Added short TTLs for relay messages and cleanup for stale presence.
- Replaced external object uploads with encrypted Convex Storage uploads scoped
  to rooms or shares.
- Added cleanup of expired rooms, public shares, metadata, and storage objects.
- Added access proofs for new collaboration rooms and public shares without
  sending fragment encryption keys to the backend.
- Kept migrated links backward-compatible and added an idempotent, byte-verified
  migration for scenes, workspaces, boards, content, and files.
- Removed the old server package, container/deploy automation, provider SDK,
  storage rules, environment declarations, and deployment job.
- Removed the obsolete storage-based Drawink Pro export bridge; the maintained
  iframe integration remains.

## Completed production actions

- Copied and verified all Firestore application records and Firebase Storage
  objects in Convex, including a separate 18-of-18 room ciphertext audit.
- Migrated all three Firebase Auth accounts to Clerk and configured verified
  Clerk-to-Convex user webhooks.
- Re-encrypted the matched personal-board content for its destination Clerk ID;
  preserved the unmatched workspace and encryption context without guessing an
  owner.
- Deleted the compromised Google service-account key and GitHub secret.
- Disabled Google Cloud billing and requested deletion of `drawink-2026`.
- Removed the executable migration runner and internal Convex migration API
  after retaining checksummed backups and the retirement record.

## P0: owner/external actions

### Rotate the exposed AI credential and clean Git history

A previously tracked `convex/.env` contained a populated `AI_API_KEY`. Removing
the file does not invalidate the key or erase earlier commits.

Required owner actions:

1. Disable and rotate the exposed provider key.
2. Review provider usage from the first exposed commit onward.
3. Store replacements only in Convex environment variables.
4. Coordinate `git filter-repo` or equivalent across all branches/clones.
5. Force-push only in an announced maintenance window.

### Verify production governance

Repository administrators should require:

- pull requests and the `Quality Gates` check on `master`;
- reviewed access to the GitHub `Production` environment;
- restricted deployment branches and secret access;
- an owner-only path for destructive data/project operations; and
- a documented security-reporting channel.

## P1: security and backend hardening

### Replace deterministic personal-board encryption

`ConvexStorageAdapter` currently derives the personal-board encryption key from
the Clerk user ID and a fixed salt. This encrypts bytes in transit/storage but
does not protect them from a party that knows the user ID and derivation logic.
Do not describe authenticated personal-board storage as server-resistant
end-to-end encryption until a multi-device key-management design is implemented.

Collaboration and public-share keys are random fragment secrets and have a
stronger confidentiality model.

### Add anonymous abuse controls

Current controls bound payload sizes, TTLs, channels, and writes per active
realtime session. A bot can still create many fresh anonymous room/share tokens.
Choose and implement one or more of:

- Clerk-required creation with anonymous read/join;
- CAPTCHA/Turnstile admission;
- a trusted edge-issued rate token; or
- deployment-level quotas and alerts with a controlled failure mode.

Add tests proving unauthorized access, replay, oversized input, channel spoofing,
and expiry behavior.

### Enforce AI limits in the provider action

`convex/aiUsage.ts` exposes usage data, but the provider action must reserve and
enforce entitlement atomically before a request, cap input/output, and define
rollback behavior on provider failure. Client-side plan checks are not a quota.

### Resolve retained legacy ownership and provenance

- Assign or deliberately archive the one preserved workspace whose legacy owner
  no longer exists in Firebase Auth.
- After the Google recovery window, decide whether historical migration fields
  and indexes should remain for auditability or be removed with a verified
  Convex backfill.

### Expand authorization coverage

Audit every public Convex query, mutation, action, and HTTP route. Add backend
tests for owner/member/collaborator roles, anonymous link proofs, cross-workspace
IDs, storage scope mismatches, and webhook verification.

## P1: incomplete product surfaces

### Billing

Subscription fields and placeholder UI exist, but checkout, customer portal,
verified billing webhooks, product/price configuration, reconciliation, and one
authoritative entitlement model are not implemented end to end.

### Organizations and board sharing

Workspace roles and Clerk organization identifiers exist, but invitations,
organization sync, member administration, and direct board-collaborator UI do
not form a complete tested workflow. The deferred dashboard and invitation scope
is preserved in [`backlog/DASHBOARD.md`](./backlog/DASHBOARD.md).

### Projects, templates, and version history

- Projects and templates have schema/UI concepts without complete CRUD flows.
- The desired dashboard project/template workflows and their security requirements
  are preserved in [`backlog/DASHBOARD.md`](./backlog/DASHBOARD.md).
- Board versions are not consistently created or exposed for restore.
- Conflict logs lack a complete recording and inspection workflow.

Complete each surface end to end or hide/remove unfinished claims.

### Package distribution

The root is a private hosted application while the README still documents the
published editor package. There is no maintained root publication pipeline, and
the included consumer guidance may belong to another source repository. Decide
ownership, then restore a tested release flow or move the package instructions.

## P2: reliability and maintainability

### Realtime integration coverage

Add multi-client tests for join/leave, reconnect, first-user initialization,
message ordering, burst behavior, follow mode, persistence fallback, files, and
cleanup. The current query deliberately returns a bounded recent window, so
tests must prove periodic full-scene synchronization converges after a burst.

### Payload-limit UX

Convex database documents are bounded. Current application limits are 700 KiB
per relay message and 900 KiB per public-share payload. Provide preflight size
feedback and a documented fallback for very large scenes instead of surfacing a
generic save failure.

### Test output and coverage

Remove remaining expected React lifecycle/`act()` warnings, increase Convex and
adapter coverage, and set reviewed thresholds for authorization and storage
lifecycles rather than relying mainly on editor-unit coverage.

### Bundle size and loading

Profile large main/WASM chunks and modules imported both statically and
dynamically. Split optional Mermaid/font-subsetting features and enforce a
reviewed bundle budget.

### Dependency and source maintenance

- Automate reviewed dependency/browser-data updates while keeping Bun, Node,
  Vite, and Vitest requirements aligned.
- Continue moving hosted-product concerns out of reusable `src/core` code.
- Reduce remaining broad `any`/`@ts-ignore` boundaries in app initialization,
  external-share IDs, and board switching.
- Add decision records for key management, offline conflicts, anonymous abuse,
  and package ownership.

## Recommended order

1. Rotate the exposed AI credential and schedule the history rewrite.
2. Assign or archive the one orphaned workspace.
3. Verify branch/environment protections and implement anonymous abuse controls.
4. Design secure multi-device personal-board key management.
5. Add backend/realtime/storage authorization and lifecycle coverage.
6. Complete or hide billing, organizations, projects, templates, history, and
   package-publication surfaces.
