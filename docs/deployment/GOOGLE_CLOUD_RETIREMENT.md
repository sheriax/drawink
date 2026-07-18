# Google Cloud retirement record

Status: **completed on 2026-07-18**.

The dedicated Drawink project `drawink-2026` is no longer part of the runtime
architecture. Billing is disabled, the project lifecycle is
`DELETE_REQUESTED`, and the executable migration helpers have been removed from
the repository. This file is a historical audit and recovery record.

## Migrated application data

| Legacy source | Verified Convex or Clerk target |
| --- | --- |
| 18 encrypted Firestore collaboration scenes | 18 `collaborativeRooms` records |
| 11 Firestore legacy share payloads | 11 `publicShares` records |
| 3 workspaces and owner memberships | 3 `workspaces` and 3 `workspaceMembers` records |
| 3 boards and 2 encrypted board contents | 3 `boards` and 2 `boardContent` records |
| 3 encrypted Firebase Storage objects (12,933 bytes) | 3 Convex `files` and 3 storage objects (12,933 bytes) |
| 3 Firebase Auth users | 3 production Clerk users and 3 Convex users |

The final source fingerprint was
`c9e625ad7d5997c8727ff58bed65455a63f969f66d3e38acffe9872bc99ca478`.
The application-data pass was repeated in verification-only mode and confirmed
that the source remained unchanged during the copy.

## Identity and encrypted ownership migration

The three Firebase accounts used OAuth: two Google accounts and one GitHub
account. Their external Firebase IDs, email-verification state, profile data,
and original signup timestamps were retained in production Clerk. Production
Clerk has both Google and GitHub sign-in enabled.

Two workspace owners matched active Firebase accounts. Those workspaces, their
memberships, and their two boards were relinked to the destination Clerk IDs.
The single matched encrypted board content was decrypted with its legacy
Firebase-ID-derived key, re-encrypted with its Clerk-ID-derived key, and then
decrypted from Convex to verify identical canonical plaintext.

One workspace owner no longer existed in Firebase Auth. Its workspace,
membership, board, and encrypted board content remain intact under the legacy
owner ID so no data was guessed, reassigned, or discarded. An owner must decide
who should receive that orphaned workspace before it becomes accessible through
a current Clerk account.

The production Clerk webhook now sends `user.created`, `user.updated`, and
`user.deleted` to the Convex HTTP endpoint. Its signing secret is stored only in
the production Convex environment, and a signed no-op delivery returned HTTP
200.

## Verification evidence

- Every migrated room, share, workspace, board, board-content record, and file
  passed the migration runner's target verification.
- A separate post-migration audit queried all 18 room IDs one at a time and
  confirmed 18 of 18 ciphertext and IV pairs byte-for-byte.
- Matched personal-board content passed source decryption, destination
  decryption, and plaintext SHA-256 comparison.
- The orphaned workspace was excluded from ownership mutation and retained with
  its legacy encryption context.
- The final Convex export contains 3 users, 3 workspaces, 3 memberships, 3
  boards, 2 board contents, 18 rooms, 11 shares, 3 file records, and 3 stored
  objects totaling 12,933 bytes.

## Retained Convex backups

These ZIP files include Convex file storage, passed `unzip -t`, and are ignored
by Git. They exist on the migration workstation rather than in the repository.

| Checkpoint | Local file | SHA-256 |
| --- | --- | --- |
| Before execution | `.migration-backups/convex-production-pre-execution-2026-07-18.zip` | `cf1f914197932cad937ba1a3a484d8fbaa377a642c8502b48e8e533db1e37122` |
| After Google application-data copy | `.migration-backups/convex-production-post-google-cloud-migration-2026-07-18.zip` | `26655dff8f9fb845dea5e23a5659ce3b3ab550855fdd4524c84e046659f0c8fd` |
| Before owner relink | `.migration-backups/convex-production-pre-owner-relink-2026-07-18.zip` | `1831ed5afbc31d64238f66a504ce35e4a1c958623be0a9351953df08b1516141` |
| Final post-auth migration | `.migration-backups/convex-production-post-auth-migration-2026-07-18.zip` | `de42f5fc59defeabd07ccfcc9562d4dc0225e3d19feb1491c4b20414821de74a` |

## Retired infrastructure

The final project inventory contained only Drawink resources:

- two zero-minimum-scale `drawink-collab` Cloud Run services and seven
  revisions across `asia-south1` and `us-central1`;
- one `collab.drawink.app` Cloud Run domain mapping;
- three Artifact Registry repositories and 16 container images;
- one Firestore database and Firebase Auth configuration;
- one application bucket containing the three migrated files;
- one Cloud Build bucket containing two build archives (12,187,188 bytes);
- Firebase rules/configuration, service accounts, the default VPC, and a managed
  certificate.

The compromised user-managed service-account key and the GitHub
`GCP_CREDENTIALS` secret were deleted before project shutdown. No user-managed
service-account keys remained at the final audit.

Repository runtime code and workflows no longer reference Firebase, Cloud Run,
the old storage bucket, or the realtime domain. The Convex-only production
release was merged as PR #16 at commit `56806206`.

## Shutdown evidence

The project was explicitly resolved before shutdown and the active account had
the Owner role. The terminal checks returned:

| Check | Final result |
| --- | --- |
| Billing account link | Empty |
| `billingEnabled` | `false` |
| Project lifecycle | `DELETE_REQUESTED` |

Disabling billing stops billable services. Project deletion entered Google's
limited recovery period; Google may permanently remove individual service data
before that period ends.

## Recovery and remaining cleanup

If a critical omission is discovered while Google still permits recovery, an
Owner can request restoration with:

```bash
gcloud projects undelete drawink-2026
```

Restoration does not automatically re-enable billing, and service recovery may
be incomplete. Prefer the verified Convex backups for data recovery.

Remaining non-Google actions are tracked in `docs/PROJECT_STATUS.md`:

- assign or deliberately archive the one orphaned workspace;
- remove the obsolete `collab.drawink.app` DNS record at its DNS provider if it
  still exists; and
- remove historical migration provenance fields/indexes after the recovery
  window if the audit trail is no longer needed.
