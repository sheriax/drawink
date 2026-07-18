#!/usr/bin/env bun

/**
 * Copies the final Drawink data out of Google Cloud and verifies it in the
 * production Convex deployment. Run only from the authenticated Blacksmith
 * Testbox, where the workflow provisions short-lived gcloud credentials. The
 * script does not accept credential blobs or write credentials to disk.
 *
 * Inventory only: bun scripts/migrate-google-cloud-to-convex.ts
 * Copy + verify:  bun scripts/migrate-google-cloud-to-convex.ts --execute
 * Verify only:    bun scripts/migrate-google-cloud-to-convex.ts --verify-only
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const projectId = "drawink-2026";
const databaseId = "(default)";
const storageBucket = "drawink-2026.firebasestorage.app";

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  timestampValue?: string;
  bytesValue?: string;
};

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

type SourceRoom = {
  roomId: string;
  ciphertextBase64: string;
  ivBase64: string;
  sceneVersion: number;
  createdAt: number;
  updatedAt: number;
};

type SourceShare = {
  shortId: string;
  payloadBase64: string;
  createdAt: number;
};

type SourceContent = {
  ciphertextBase64: string;
  ivBase64: string;
  checksum: string;
  version: number;
  updatedAt: number;
  updatedBy: string;
};

type SourceBoard = {
  legacyBoardId: string;
  name: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  content?: SourceContent;
};

type SourceWorkspace = {
  legacyWorkspaceId: string;
  name: string;
  ownerId: string;
  memberCount: number;
  createdAt: number;
  updatedAt: number;
  boards: SourceBoard[];
};

type FileScope = "room" | "publicShare" | "legacyShare";

type SourceFile = {
  objectName: string;
  scope: FileScope;
  scopeId: string;
  fileId: string;
  size: number;
  contentType: string;
  createdAt: number;
  md5Hash?: string;
};

type SourceSnapshot = {
  rooms: SourceRoom[];
  shares: SourceShare[];
  workspaces: SourceWorkspace[];
  files: SourceFile[];
};

type Verification = {
  rooms: Array<{
    roomId: string;
    ciphertextBase64?: string;
    ivBase64?: string;
    sceneVersion?: number;
    updatedAt?: number;
  }>;
  shares: Array<{ shortId: string; payloadBase64?: string; createdAt?: number }>;
  workspaces: Array<{
    legacyWorkspaceId: string;
    workspaceId?: string;
    ownerId?: string;
  }>;
  boards: Array<{
    legacyWorkspaceId: string;
    legacyBoardId: string;
    boardId?: string;
    content?: SourceContent;
  }>;
  files: Array<{
    scope: FileScope;
    scopeId: string;
    fileId: string;
    sizeBytes: number;
    url: string | null;
  }>;
};

const execute = process.argv.includes("--execute");
const verifyOnly = process.argv.includes("--verify-only");
if (execute && verifyOnly) {
  throw new Error("Choose either --execute or --verify-only");
}

const command = (program: string, args: string[]) => {
  const result = spawnSync(program, args, {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `${program} ${args[0] ?? ""} failed: ${(result.stderr || result.stdout).trim()}`,
    );
  }
  return result.stdout.trim();
};

const runConvex = <Result>(functionName: string, args: Record<string, unknown>): Result => {
  const output = command("bunx", [
    "convex",
    "run",
    functionName,
    JSON.stringify(args),
    "--prod",
    "--typecheck",
    "disable",
    "--codegen",
    "disable",
  ]);
  return JSON.parse(output) as Result;
};

const requiredField = (document: FirestoreDocument, name: string): FirestoreValue => {
  const value = document.fields?.[name];
  if (!value) {
    throw new Error(`${document.name} is missing ${name}`);
  }
  return value;
};

const stringField = (document: FirestoreDocument, name: string) => {
  const value = requiredField(document, name).stringValue;
  if (value === undefined) {
    throw new Error(`${document.name}.${name} is not a string`);
  }
  return value;
};

const bytesField = (document: FirestoreDocument, name: string) => {
  const value = requiredField(document, name).bytesValue;
  if (value === undefined) {
    throw new Error(`${document.name}.${name} is not bytes`);
  }
  return value;
};

const integerField = (document: FirestoreDocument, name: string) => {
  const value = requiredField(document, name).integerValue;
  if (value === undefined || !Number.isSafeInteger(Number(value))) {
    throw new Error(`${document.name}.${name} is not a safe integer`);
  }
  return Number(value);
};

const timestampField = (document: FirestoreDocument, name: string) => {
  const raw = requiredField(document, name).timestampValue;
  if (!raw) {
    throw new Error(`${document.name}.${name} is not a timestamp`);
  }
  const value = Date.parse(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${document.name}.${name} is not a valid timestamp`);
  }
  return value;
};

const documentId = (document: FirestoreDocument) => document.name.split("/").at(-1)!;
const timestamp = (value: string | undefined, fallback: number, label: string) => {
  if (!value) {
    return fallback;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} is not a valid timestamp`);
  }
  return parsed;
};
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const decoded = (base64: string) => new Uint8Array(Buffer.from(base64, "base64"));

const accessToken = command("gcloud", ["auth", "print-access-token"]);

const cloudFetch = async (url: string) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google Cloud request failed (${response.status}) for ${url}`);
  }
  return response;
};

const listFirestore = async (relativePath: string): Promise<FirestoreDocument[]> => {
  const encodedPath = relativePath.split("/").map(encodeURIComponent).join("/");
  const documents: FirestoreDocument[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${encodedPath}`,
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }
    const page = (await (await cloudFetch(url.toString())).json()) as {
      documents?: FirestoreDocument[];
      nextPageToken?: string;
    };
    documents.push(...(page.documents ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return documents;
};

const listFiles = async (): Promise<SourceFile[]> => {
  const objects: Array<{
    name: string;
    size: string;
    contentType?: string;
    timeCreated?: string;
    updated?: string;
    md5Hash?: string;
  }> = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`https://storage.googleapis.com/storage/v1/b/${storageBucket}/o`);
    url.searchParams.set("maxResults", "1000");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }
    const page = (await (await cloudFetch(url.toString())).json()) as {
      items?: Array<{
        name: string;
        size: string;
        contentType?: string;
        timeCreated?: string;
        updated?: string;
        md5Hash?: string;
      }>;
      nextPageToken?: string;
    };
    objects.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return objects.map((object) => {
    const match = object.name.match(/^files\/(shareLinks|publicShares|rooms)\/([^/]+)\/([^/]+)$/);
    if (!match) {
      throw new Error(`Unexpected legacy storage object: ${object.name}`);
    }
    const scopeByDirectory = {
      shareLinks: "legacyShare",
      publicShares: "publicShare",
      rooms: "room",
    } as const;
    const size = Number(object.size);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new Error(`Invalid object size for ${object.name}`);
    }
    return {
      objectName: object.name,
      scope: scopeByDirectory[match[1] as keyof typeof scopeByDirectory],
      scopeId: match[2],
      fileId: match[3],
      size,
      contentType: object.contentType ?? "application/octet-stream",
      createdAt: timestamp(
        object.timeCreated ?? object.updated,
        Date.now(),
        `${object.name}.timeCreated`,
      ),
      md5Hash: object.md5Hash,
    };
  });
};

const collectSource = async (): Promise<SourceSnapshot> => {
  const sceneDocuments = await listFirestore("scenes");
  const rooms: SourceRoom[] = [];
  const shares: SourceShare[] = [];
  for (const scene of sceneDocuments) {
    if (scene.fields?.ciphertext && scene.fields.iv && scene.fields.sceneVersion) {
      const createdAt = timestamp(scene.createTime, Date.now(), `${scene.name}.createTime`);
      rooms.push({
        roomId: documentId(scene),
        ciphertextBase64: bytesField(scene, "ciphertext"),
        ivBase64: bytesField(scene, "iv"),
        sceneVersion: integerField(scene, "sceneVersion"),
        createdAt,
        updatedAt: timestamp(scene.updateTime, createdAt, `${scene.name}.updateTime`),
      });
    } else if (scene.fields?.sceneData && scene.fields.createdAt) {
      shares.push({
        shortId: documentId(scene),
        payloadBase64: stringField(scene, "sceneData"),
        createdAt: timestamp(stringField(scene, "createdAt"), 0, `${scene.name}.createdAt`),
      });
    } else {
      throw new Error(`Unknown scenes document shape: ${scene.name}`);
    }
  }

  const workspaceDocuments = await listFirestore("workspaces");
  const workspaces: SourceWorkspace[] = [];
  for (const workspace of workspaceDocuments) {
    const legacyWorkspaceId = documentId(workspace);
    const ownerId = stringField(workspace, "ownerUserId");
    const boardDocuments = await listFirestore(`workspaces/${legacyWorkspaceId}/boards`);
    const boards: SourceBoard[] = [];
    for (const board of boardDocuments) {
      const legacyBoardId = documentId(board);
      const contents = await listFirestore(
        `workspaces/${legacyWorkspaceId}/boards/${legacyBoardId}/content`,
      );
      if (contents.length > 1) {
        throw new Error(`${board.name} has more than one current content document`);
      }
      const contentDocument = contents[0];
      const ciphertextBase64 = contentDocument
        ? bytesField(contentDocument, "ciphertext")
        : undefined;
      const ivBase64 = contentDocument ? bytesField(contentDocument, "iv") : undefined;
      boards.push({
        legacyBoardId,
        name: stringField(board, "name"),
        ownerId: board.fields?.createdBy?.stringValue ?? ownerId,
        createdAt: timestampField(board, "createdAt"),
        updatedAt: timestampField(board, "updatedAt"),
        content:
          contentDocument && ciphertextBase64 && ivBase64
            ? {
                ciphertextBase64,
                ivBase64,
                checksum: sha256(
                  Buffer.concat([
                    Buffer.from(ciphertextBase64, "base64"),
                    Buffer.from(ivBase64, "base64"),
                  ]),
                ),
                version: integerField(contentDocument, "version"),
                updatedAt: timestampField(contentDocument, "updatedAt"),
                updatedBy: stringField(contentDocument, "updatedBy"),
              }
            : undefined,
      });
    }
    workspaces.push({
      legacyWorkspaceId,
      name: stringField(workspace, "name"),
      ownerId,
      memberCount: integerField(workspace, "memberCount"),
      createdAt: timestampField(workspace, "createdAt"),
      updatedAt: timestampField(workspace, "updatedAt"),
      boards,
    });
  }

  return {
    rooms: rooms.sort((a, b) => a.roomId.localeCompare(b.roomId)),
    shares: shares.sort((a, b) => a.shortId.localeCompare(b.shortId)),
    workspaces: workspaces.sort((a, b) => a.legacyWorkspaceId.localeCompare(b.legacyWorkspaceId)),
    files: (await listFiles()).sort((a, b) => a.objectName.localeCompare(b.objectName)),
  };
};

const sourceFingerprint = (source: SourceSnapshot) =>
  sha256(
    Buffer.from(
      JSON.stringify({
        rooms: source.rooms,
        shares: source.shares,
        workspaces: source.workspaces,
        files: source.files,
      }),
    ),
  );

const downloadLegacyFile = async (file: SourceFile) => {
  const url = new URL(
    `https://storage.googleapis.com/download/storage/v1/b/${storageBucket}/o/${encodeURIComponent(file.objectName)}`,
  );
  url.searchParams.set("alt", "media");
  return new Uint8Array(await (await cloudFetch(url.toString())).arrayBuffer());
};

const migrate = async (source: SourceSnapshot) => {
  for (const room of source.rooms) {
    runConvex("googleCloudMigration:upsertCollaborativeRoom", room);
  }
  for (const share of source.shares) {
    runConvex("googleCloudMigration:upsertLegacyShare", share);
  }

  for (const workspace of source.workspaces) {
    const workspaceResult = runConvex<{ workspaceId: string }>(
      "googleCloudMigration:upsertWorkspace",
      {
        legacyWorkspaceId: workspace.legacyWorkspaceId,
        name: workspace.name,
        ownerId: workspace.ownerId,
        memberCount: workspace.memberCount,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
    );
    for (const board of workspace.boards) {
      const boardResult = runConvex<{ boardId: string }>("googleCloudMigration:upsertBoard", {
        workspaceId: workspaceResult.workspaceId,
        legacyWorkspaceId: workspace.legacyWorkspaceId,
        legacyBoardId: board.legacyBoardId,
        name: board.name,
        ownerId: board.ownerId,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      });
      if (board.content) {
        runConvex("googleCloudMigration:upsertBoardContent", {
          boardId: boardResult.boardId,
          ...board.content,
        });
      }
    }
  }

  for (const file of source.files) {
    const bytes = await downloadLegacyFile(file);
    if (bytes.byteLength !== file.size) {
      throw new Error(`Source object size changed during download: ${file.objectName}`);
    }
    const uploadUrl = runConvex<string>("googleCloudMigration:generateFileUploadUrl", {
      scope: file.scope,
      scopeId: file.scopeId,
    });
    const upload = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.contentType },
      body: bytes,
    });
    if (!upload.ok) {
      throw new Error(`Convex Storage upload failed (${upload.status}) for ${file.objectName}`);
    }
    const result = (await upload.json()) as { storageId?: string };
    if (!result.storageId) {
      throw new Error(`Convex Storage did not return an ID for ${file.objectName}`);
    }
    try {
      runConvex("googleCloudMigration:registerFile", {
        scope: file.scope,
        scopeId: file.scopeId,
        fileId: file.fileId,
        storageId: result.storageId,
        createdAt: file.createdAt,
      });
    } catch (error) {
      runConvex("googleCloudMigration:discardFileUpload", { storageId: result.storageId });
      throw error;
    }
  }
};

const assertEqualBytes = (label: string, source: string, target: string | undefined) => {
  if (!target || sha256(decoded(source)) !== sha256(decoded(target))) {
    throw new Error(`${label} failed byte-for-byte verification`);
  }
};

const verify = async (source: SourceSnapshot) => {
  const target = runConvex<Verification>("googleCloudMigration:verify", {
    roomIds: source.rooms.map((room) => room.roomId),
    shortIds: source.shares.map((share) => share.shortId),
    legacyWorkspaceIds: source.workspaces.map((workspace) => workspace.legacyWorkspaceId),
    boards: source.workspaces.flatMap((workspace) =>
      workspace.boards.map((board) => ({
        legacyWorkspaceId: workspace.legacyWorkspaceId,
        legacyBoardId: board.legacyBoardId,
      })),
    ),
    files: source.files.map((file) => ({
      scope: file.scope,
      scopeId: file.scopeId,
      fileId: file.fileId,
    })),
  });

  for (const room of source.rooms) {
    const migrated = target.rooms.find((candidate) => candidate.roomId === room.roomId);
    assertEqualBytes(
      `Room ${room.roomId} ciphertext`,
      room.ciphertextBase64,
      migrated?.ciphertextBase64,
    );
    assertEqualBytes(`Room ${room.roomId} IV`, room.ivBase64, migrated?.ivBase64);
    if (migrated?.sceneVersion !== room.sceneVersion) {
      throw new Error(`Room ${room.roomId} version verification failed`);
    }
    if (migrated.updatedAt !== room.updatedAt) {
      throw new Error(`Room ${room.roomId} timestamp verification failed`);
    }
  }

  for (const share of source.shares) {
    const migrated = target.shares.find((candidate) => candidate.shortId === share.shortId);
    assertEqualBytes(`Share ${share.shortId}`, share.payloadBase64, migrated?.payloadBase64);
    if (migrated?.createdAt !== share.createdAt) {
      throw new Error(`Share ${share.shortId} timestamp verification failed`);
    }
  }

  for (const workspace of source.workspaces) {
    const migratedWorkspace = target.workspaces.find(
      (candidate) => candidate.legacyWorkspaceId === workspace.legacyWorkspaceId,
    );
    if (!migratedWorkspace?.workspaceId || migratedWorkspace.ownerId !== workspace.ownerId) {
      throw new Error(`Workspace ${workspace.legacyWorkspaceId} verification failed`);
    }
    for (const board of workspace.boards) {
      const migratedBoard = target.boards.find(
        (candidate) =>
          candidate.legacyWorkspaceId === workspace.legacyWorkspaceId &&
          candidate.legacyBoardId === board.legacyBoardId,
      );
      if (!migratedBoard?.boardId) {
        throw new Error(`Board ${workspace.legacyWorkspaceId}/${board.legacyBoardId} is missing`);
      }
      if (board.content) {
        assertEqualBytes(
          `Board ${board.legacyBoardId} ciphertext`,
          board.content.ciphertextBase64,
          migratedBoard.content?.ciphertextBase64,
        );
        assertEqualBytes(
          `Board ${board.legacyBoardId} IV`,
          board.content.ivBase64,
          migratedBoard.content?.ivBase64,
        );
        if (migratedBoard.content?.version !== board.content.version) {
          throw new Error(`Board ${board.legacyBoardId} version verification failed`);
        }
        if (
          migratedBoard.content.checksum !== board.content.checksum ||
          migratedBoard.content.updatedAt !== board.content.updatedAt
        ) {
          throw new Error(`Board ${board.legacyBoardId} metadata verification failed`);
        }
      }
    }
  }

  for (const file of source.files) {
    const migrated = target.files.find(
      (candidate) =>
        candidate.scope === file.scope &&
        candidate.scopeId === file.scopeId &&
        candidate.fileId === file.fileId,
    );
    if (!migrated?.url || migrated.sizeBytes !== file.size) {
      throw new Error(`File ${file.objectName} metadata verification failed`);
    }
    const [sourceBytes, targetResponse] = await Promise.all([
      downloadLegacyFile(file),
      fetch(migrated.url),
    ]);
    if (!targetResponse.ok) {
      throw new Error(`File ${file.objectName} could not be read from Convex Storage`);
    }
    const targetBytes = new Uint8Array(await targetResponse.arrayBuffer());
    if (sha256(sourceBytes) !== sha256(targetBytes)) {
      throw new Error(`File ${file.objectName} failed byte-for-byte verification`);
    }
  }
};

if ((execute || verifyOnly) && !process.env.CONVEX_DEPLOY_KEY) {
  throw new Error("CONVEX_DEPLOY_KEY is required for production migration or verification");
}

const source = await collectSource();
console.log(
  `Source inventory: ${source.rooms.length} rooms, ${source.shares.length} shares, ` +
    `${source.workspaces.length} workspaces, ` +
    `${source.workspaces.reduce((count, workspace) => count + workspace.boards.length, 0)} boards, ` +
    `${source.workspaces.reduce(
      (count, workspace) =>
        count + workspace.boards.filter((board) => board.content !== undefined).length,
      0,
    )} board contents, ${source.files.length} files.`,
);

if (execute) {
  await migrate(source);
}
if (execute || verifyOnly) {
  await verify(source);
  const finalSource = await collectSource();
  if (sourceFingerprint(source) !== sourceFingerprint(finalSource)) {
    throw new Error("Google Cloud source data changed during migration; rerun before cutover");
  }
  console.log("Convex migration verified byte-for-byte; source remained unchanged during the run.");
} else {
  console.log("Inventory only. Pass --execute to copy and verify this snapshot.");
}
