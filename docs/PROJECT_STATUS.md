# Project status and improvement register

Audit date: **2026-07-17**

Quality branch: `codex/fix-all-quality-gates`

Audited base: `2744ce5868abc2e7b6a9889f89dcea6db0a987b0`

This document separates verified repository health from product, security, and
operations work that still requires design decisions or external access.

## Executive status

| Area | Status | Evidence or remaining work |
|---|---|---|
| Git sync | Current | `origin/master` and the audited local base were both at `2744ce58` before this branch was created |
| Biome | Passing | 679 files checked with no diagnostics |
| Frontend and Convex types | Passing | `bun run typecheck` exits successfully |
| Collaboration server types | Passing | Dedicated strict `server/tsconfig.json` and `bun run typecheck:collab` exit successfully |
| Tests | Passing | 53 files; 584 passed and 9 intentionally skipped |
| Production builds | Passing | Vite/PWA frontend and Bun collaboration-server bundles both build successfully |
| CI | Enforced | Frozen install, lint, both type-checks, tests, and both builds are required on pull requests |
| Package management | Reproducible | Bun 1.3.14 is pinned; root and server installs use committed lockfiles |
| Dependency audit | Passing | Root application and collaboration-server lockfiles report no known vulnerabilities |
| Documentation | Reorganized | Architecture, development, deployment, and status documents have explicit scopes |
| Credential exposure | Partially remediated | `convex/.env` is removed from tracking and ignored; provider rotation and a coordinated history rewrite remain external actions |
| Production security | Blocked | Firebase rules, backend abuse controls, and deployment protections still need owner decisions and external configuration |

## Completed on the quality branch

- Removed all reported TypeScript and Biome diagnostics while retaining explicit
  exceptions only where the editor's keyboard-application semantics require one.
- Repaired the reusable editor boundary so Clerk-specific dashboard behavior
  lives in the application shell.
- Restored history polymorphism, WOFF2 bindings, editor focus behavior, library
  navigation, clipboard/image flows, and legacy Excalidraw image imports.
- Repaired and isolated the test harness, refreshed reviewed snapshots, and made
  all 593 collected tests deterministic.
- Added a real collaboration-server TypeScript project instead of accidentally
  inheriting a root config that excluded the server.
- Pinned Bun, replaced the mixed root pnpm/Bun setup, and enabled frozen installs.
- Updated vulnerable direct dependencies and pinned patched transitive releases;
  both Bun lockfiles now pass `bun audit` with no known vulnerabilities.
- Changed CI and deployment verification from build-only checks to complete
  quality gates.
- Removed the populated Convex environment file from Git tracking, added a
  placeholder-only template, and retained the developer's ignored local copy.
- Archived the obsolete revamp plan and added current architecture, development,
  deployment, and documentation indexes.

## P0: external security actions

### Rotate the exposed AI credential and clean Git history

The previously tracked `convex/.env` contained a populated `AI_API_KEY`. This
branch prevents future commits of that file, but deleting a tracked file does not
invalidate a credential or remove it from existing commits.

Repository/provider owners must:

1. Disable and rotate the exposed provider key.
2. Review provider usage from the first exposed commit onward.
3. Store replacements with `bunx convex env set` and `--prod`, never in Git.
4. Coordinate `git filter-repo` (or equivalent) across every branch and clone.
5. Force-push only during an announced maintenance window.

History rewriting is intentionally not performed in this feature branch because
it is destructive and requires repository-owner coordination.

### Replace permissive Firebase rules

`firebase-project/storage.rules` permits anonymous room/share-link object writes,
and the legacy Firestore rules permit public scene/workspace access. Encryption
does not prevent overwrite, deletion, quota abuse, or unexpected storage cost.

Required work:

- choose Clerk-to-Firebase authorization or a verified signed-URL/server flow;
- validate ownership, immutable identifiers, content type, and size;
- deny undeclared paths;
- remove legacy Firestore deployment if it is no longer used; and
- add emulator-backed rules tests before production deployment.

## P1: backend and operational hardening

### Enforce AI limits inside the action

`convex/aiUsage.ts` exposes usage information, but the external-provider action
must own the authoritative entitlement and quota decision. Reserve usage
atomically before the provider call, cap input/output sizes, and define rollback
behavior for failed calls.

### Close authorization and abuse gaps

- Verify workspace membership inside every board/workspace query, not only at the
  client route.
- Add quotas for anonymous public-share creation and a retention job for expired
  shares.
- Add authenticated or signed room admission to the Socket.io server; per-socket
  rate limiting can be bypassed by reconnecting.
- Add authorization tests for every public Convex query, mutation, and action.
- Decide whether Firebase or Convex owns each binary/metadata lifecycle.

### Protect production outside the repository

The workflows now gate deployment and serialize production runs, but GitHub
administrators still need to configure:

- required pull requests and the `Quality Gates` status check on `master`;
- required reviewers for the `Production` environment;
- restricted deployment branches and secret access; and
- an immutable image-tag/rollback policy for Cloud Run.

Path filters should be added once service ownership is finalized so a docs-only
change cannot redeploy backend infrastructure.

## P1: incomplete product surfaces

### Billing

Stripe fields and placeholder UI exist, but checkout, customer portal, verified
webhooks, product/price configuration, and subscription reconciliation are not
implemented end to end. Plan entitlement logic is also duplicated and can treat
`pro`, `team`, and beta users inconsistently.

### Organizations and sharing

Workspace roles and Clerk organization identifiers exist, but invite/add-member,
organization sync, and board-collaborator management do not form a complete UI
and backend workflow.

### Projects, templates, and version history

- `projects` and `templates` have schema/UI concepts without complete CRUD flows.
- `boardVersions` can be cleaned up, but versions are not consistently created or
  exposed for restore.
- `conflictLogs` exists without a complete recording or inspection workflow.

Implement and test each surface end to end, or feature-flag/remove claims until
it is supported.

### File lifecycle

Workspace/board metadata deletion can leave Firebase objects behind. Consolidate
the active storage adapter, add idempotent server-side cleanup and retention, and
cover room, share-link, public-share, and board paths with integration tests.

### Package distribution

The root is a private hosted application, while the README still documents the
published `@drawink/drawink` consumer package. The repository has no maintained
root publish pipeline, and the Next.js example reflects an older workspace
layout. Decide whether this repository owns package publication; then either
restore a tested package build/release flow or move package instructions and
examples to their actual source repository.

## P2: maintainability and quality improvements

### Test output and coverage

The suite passes, but a few tests intentionally exercise error paths and React
19 emits `act()`/lifecycle warnings in older editor tests. Remove those warnings
incrementally, add backend authorization tests, and establish coverage thresholds
for Convex, storage adapters, and the collaboration protocol.

### Bundle size and loading

The production build succeeds but reports large main/WASM chunks and several
modules imported both statically and dynamically. Profile real loading behavior,
split optional Mermaid/font-subsetting features, and set a reviewed bundle budget
instead of merely raising Vite's warning limit.

### Dependency maintenance

Automate reviewed dependency and browser-data updates. Keep Bun, the server
container image, Vite, Vitest, and their Node engine requirements synchronized.

### Source boundaries

Continue moving hosted-product concerns out of `src/core/`, reduce duplicate
storage and migration helpers, and document architectural decisions for
authentication, persistence ownership, offline conflict resolution, and public
sharing.

### Repository metadata

Confirm the intended license, support policy, security reporting channel, and
code-owner/reviewer map. Add the corresponding top-level metadata if this
repository will accept external contributions.

## Recommended execution order

1. Rotate the exposed credential and schedule the history rewrite.
2. Replace Firebase rules and add authorization/rules tests.
3. Enable GitHub branch and Production-environment protections.
4. Enforce AI quotas and audit all public backend authorization paths.
5. Add backend/protocol coverage and eliminate remaining test warnings.
6. Decide package-publication ownership and remove stale consumer claims.
7. Complete or feature-flag billing, organizations, projects, templates, and
   version history.
8. Profile and split the largest frontend chunks.
