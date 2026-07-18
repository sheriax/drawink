# Legacy cloud retirement runbook

This is a one-time runbook for moving the remaining Drawink records and encrypted
files to Convex, then shutting down the dedicated `drawink-2026` project so it
cannot generate future charges.

Do not delete or disable the source project until every gate below is complete.
The currently deployed pre-cutover frontend still writes to those services.

## Latest read-only inventory

Inventory taken on 2026-07-18. The migration script re-reads the source at run
time; its counts are authoritative if they differ from this snapshot.

| Source | Observed data/resources |
| --- | --- |
| Firestore `scenes` | 15 encrypted collaboration-room snapshots and 11 legacy share payloads |
| Firestore workspaces | 3 workspaces, 3 boards, 2 encrypted board-content records |
| Application object bucket | 3 encrypted share files, 12,933 bytes total |
| Build artifact bucket | 2 build objects, about 12.2 MB |
| Cloud Run | 2 regional `drawink-collab` services and 7 revisions |
| Cloud Run domain | `collab.drawink.app` mapping in `us-central1` |
| Artifact Registry | 3 repositories and 16 container images |
| Other project assets | identity configuration, service accounts/keys, default network, and certificates |

The project appeared dedicated to Drawink; no unrelated application resources
were found. Project deletion is therefore the final target, rather than keeping
an empty billable project.

## Target mapping

| Legacy data | Convex target |
| --- | --- |
| Encrypted collaboration scene | `collaborativeRooms` |
| Legacy public-share scene | `publicShares.shortId` |
| Workspace/board/content | `workspaces`, `boards`, `boardContent` |
| Encrypted room/share object | Convex Storage plus the matching `files` scope |
| Realtime transport | `collaborationSessions` and short-lived `collaborationMessages` |

Payloads remain encrypted; the migration copies ciphertext and IVs without
decrypting them.

## Gate 1: replacement readiness

- [x] The Convex-only branch passes `bun run verify` in Testbox; GitHub CI
      remains a PR gate.
- [x] New Convex functions/schema were deployed to production on 2026-07-18
      after a production dry-run and empty legacy-file-table check.
- [ ] Old browser clients remain compatible with that additive backend deploy.
- [ ] The Vercel preview passes board, share, file, and two-client collaboration
      smoke tests.
- [x] A production Convex export, including file storage, was retained and its
      ZIP checksum/integrity verified on 2026-07-18. The Git-ignored local file
      is `.migration-backups/convex-production-pre-google-cloud-migration-2026-07-18.zip`;
      SHA-256 is
      `88e937012a0cef399de31025b7e2bbb388b237512ebdc3788a617457e5bdf253`.

The first deployed retention run removed the sole pre-existing Convex public
share because it was already 102 whole days past its stored `expiresAt`. The
verified pre-deploy export retains that expired record if recovery is needed.

## Gate 2: initial migration

Run from the authenticated Blacksmith Testbox. The Testbox must have the
Production `CONVEX_DEPLOY_KEY` and short-lived cloud authentication. Do not run
the migration from a developer laptop.

The dedicated migration identity needs only these temporary source-read roles:

```bash
gcloud projects add-iam-policy-binding drawink-2026 \
  --member='serviceAccount:drawink-github-actions@drawink-2026.iam.gserviceaccount.com' \
  --role='roles/datastore.viewer'

gcloud storage buckets add-iam-policy-binding \
  gs://drawink-2026.firebasestorage.app \
  --member='serviceAccount:drawink-github-actions@drawink-2026.iam.gserviceaccount.com' \
  --role='roles/storage.objectViewer'
```

Remove both bindings after the final verified pass if project deletion is not
performed immediately. The 2026-07-18 initial attempt stopped with `403` before
reading source data or writing any migration target.

```bash
# Read-only inventory.
bun scripts/migrate-google-cloud-to-convex.ts

# Idempotent copy followed by byte-for-byte verification.
bun scripts/migrate-google-cloud-to-convex.ts --execute

# Independent repeat verification.
bun scripts/migrate-google-cloud-to-convex.ts --verify-only
```

The runner fails if:

- a source document has an unknown shape;
- an object is outside the supported `rooms`, `publicShares`, or legacy
  `shareLinks` paths;
- a target record/object is missing;
- ciphertext, IV, file bytes, or versions differ;
- an object changes size while downloading; or
- the source snapshot changes during the migration window.

Store the command summary and source counts with the release record. Never log
payload contents, access tokens, or deployment keys.

## Gate 3: application cutover

1. Merge the reviewed branch.
2. Wait for the Convex production job and Vercel production deployment to pass.
3. Confirm the deployed frontend SHA matches the merged commit.
4. Run the production smoke tests in `DEPLOY.md`.
5. Confirm browser traffic no longer targets the legacy realtime domain,
   Firestore, or the old object bucket.
6. Remove the obsolete browser variables from Vercel Development, Preview, and
   Production environments.
7. Run the migration again to capture writes made between the first copy and
   frontend cutover.
8. Observe a no-write window long enough to flush already-open/PWA clients,
   then run `--verify-only` once more.

Do not treat deletion of Vercel variables as a migration: variables are baked
into old frontend deployments. The live production deployment must already be
the Convex-only build.

## Gate 4: external references

- [ ] Remove the `collab.drawink.app` DNS record after production no longer uses
      it.
- [ ] Search repository, Vercel, and GitHub configuration for the project ID,
      old service URL, and object-storage variables.
- [ ] Remove the Production `GCP_CREDENTIALS` GitHub secret after migration.
- [ ] Confirm no scheduled workflow or external webhook deploys the old server.
- [ ] Retain only this historical runbook/migration audit trail.

## Gate 5: disable billing and delete the project

Resolve the exact target first:

```bash
gcloud projects describe drawink-2026 \
  --format='value(projectId,lifecycleState)'
gcloud billing projects describe drawink-2026 \
  --format='value(projectId,billingEnabled)'
```

After every preceding checkbox is complete, disable billing and request project
deletion:

```bash
gcloud billing projects unlink drawink-2026 --quiet
gcloud projects delete drawink-2026 --quiet
```

Verify the terminal state:

```bash
gcloud projects describe drawink-2026 \
  --format='value(projectId,lifecycleState)'
gcloud billing projects describe drawink-2026 \
  --format='value(projectId,billingEnabled)'
```

Expected lifecycle state is `DELETE_REQUESTED`; billing should be disabled.
According to the official
[project deletion guide](https://docs.cloud.google.com/resource-manager/docs/delete-restore-projects),
the project has a 30-day recovery window, but some services can remove data
sooner. Billing unlink immediately stops billable services, according to the
[`gcloud billing projects unlink` reference](https://docs.cloud.google.com/sdk/gcloud/reference/billing/projects/unlink).

## Recovery

If a post-cutover data loss is discovered during the recovery window:

```bash
gcloud projects undelete drawink-2026
```

Restoring the project does not automatically re-enable billing and service
recovery can be incomplete or delayed. Prefer restoring the verified Convex
export or rerunning the migration while the source is still readable.

## Completion record

| Check | Result |
| --- | --- |
| Pre-migration Convex export | Complete, retained locally, checksum-verified on 2026-07-18 |
| Convex production schema/functions | Deployed and schema-validated on 2026-07-18 |
| Initial migration and byte verification | Blocked on temporary source viewer roles; no migration writes made |
| Convex-only production frontend live | Pending |
| Final no-write-window migration | Pending |
| Vercel variables removed | Pending |
| DNS and GitHub credential removed | Pending |
| Billing disabled | Pending |
| Project lifecycle `DELETE_REQUESTED` | Pending |
