/**
 * Convex Schema for Drawink
 *
 * This schema defines the database structure for Drawink using Convex.
 * Files are stored in Firebase Storage (cost-effective), while metadata
 * and board data are stored in Convex for reactive real-time updates.
 */
declare const _default: import("convex/server").SchemaDefinition<{
    users: import("convex/server").TableDefinition<import("convex/values").VObject<{
        photoUrl?: string | undefined;
        stripeCustomerId?: string | undefined;
        stripeSubscriptionId?: string | undefined;
        subscriptionExpiresAt?: number | undefined;
        clerkId: string;
        email: string;
        name: string;
        subscriptionTier: "free" | "pro" | "team";
        createdAt: number;
        lastLoginAt: number;
    }, {
        clerkId: import("convex/values").VString<string, "required">;
        email: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        photoUrl: import("convex/values").VString<string | undefined, "optional">;
        subscriptionTier: import("convex/values").VUnion<"free" | "pro" | "team", [import("convex/values").VLiteral<"free", "required">, import("convex/values").VLiteral<"pro", "required">, import("convex/values").VLiteral<"team", "required">], "required", never>;
        stripeCustomerId: import("convex/values").VString<string | undefined, "optional">;
        stripeSubscriptionId: import("convex/values").VString<string | undefined, "optional">;
        subscriptionExpiresAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        lastLoginAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "clerkId" | "email" | "name" | "photoUrl" | "subscriptionTier" | "stripeCustomerId" | "stripeSubscriptionId" | "subscriptionExpiresAt" | "createdAt" | "lastLoginAt">, {
        by_clerk_id: ["clerkId", "_creationTime"];
        by_email: ["email", "_creationTime"];
    }, {}, {}>;
    workspaces: import("convex/server").TableDefinition<import("convex/values").VObject<{
        clerkOrgId?: string | undefined;
        name: string;
        subscriptionTier: "free" | "team";
        createdAt: number;
        ownerId: string;
        updatedAt: number;
        memberCount: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        ownerId: import("convex/values").VString<string, "required">;
        clerkOrgId: import("convex/values").VString<string | undefined, "optional">;
        subscriptionTier: import("convex/values").VUnion<"free" | "team", [import("convex/values").VLiteral<"free", "required">, import("convex/values").VLiteral<"team", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        memberCount: import("convex/values").VFloat64<number, "required">;
    }, "required", "name" | "subscriptionTier" | "createdAt" | "ownerId" | "clerkOrgId" | "updatedAt" | "memberCount">, {
        by_owner: ["ownerId", "_creationTime"];
        by_clerk_org: ["clerkOrgId", "_creationTime"];
    }, {}, {}>;
    workspaceMembers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        workspaceId: import("convex/values").GenericId<"workspaces">;
        userId: string;
        role: "owner" | "admin" | "member" | "viewer";
        joinedAt: number;
    }, {
        workspaceId: import("convex/values").VId<import("convex/values").GenericId<"workspaces">, "required">;
        userId: import("convex/values").VString<string, "required">;
        role: import("convex/values").VUnion<"owner" | "admin" | "member" | "viewer", [import("convex/values").VLiteral<"owner", "required">, import("convex/values").VLiteral<"admin", "required">, import("convex/values").VLiteral<"member", "required">, import("convex/values").VLiteral<"viewer", "required">], "required", never>;
        joinedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "workspaceId" | "userId" | "role" | "joinedAt">, {
        by_workspace: ["workspaceId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_workspace_and_user: ["workspaceId", "userId", "_creationTime"];
    }, {}, {}>;
    projects: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        color?: string | undefined;
        icon?: string | undefined;
        parentProjectId?: import("convex/values").GenericId<"projects"> | undefined;
        archivedAt?: number | undefined;
        name: string;
        createdAt: number;
        ownerId: string;
        updatedAt: number;
        workspaceId: import("convex/values").GenericId<"workspaces">;
    }, {
        name: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        color: import("convex/values").VString<string | undefined, "optional">;
        icon: import("convex/values").VString<string | undefined, "optional">;
        workspaceId: import("convex/values").VId<import("convex/values").GenericId<"workspaces">, "required">;
        ownerId: import("convex/values").VString<string, "required">;
        parentProjectId: import("convex/values").VId<import("convex/values").GenericId<"projects"> | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        archivedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "name" | "createdAt" | "ownerId" | "updatedAt" | "workspaceId" | "description" | "color" | "icon" | "parentProjectId" | "archivedAt">, {
        by_workspace: ["workspaceId", "_creationTime"];
        by_owner: ["ownerId", "_creationTime"];
        by_workspace_not_archived: ["workspaceId", "archivedAt", "_creationTime"];
    }, {}, {}>;
    boards: import("convex/server").TableDefinition<import("convex/values").VObject<{
        archivedAt?: number | undefined;
        thumbnailUrl?: string | undefined;
        projectId?: import("convex/values").GenericId<"projects"> | undefined;
        publicLinkId?: string | undefined;
        name: string;
        createdAt: number;
        ownerId: string;
        updatedAt: number;
        workspaceId: import("convex/values").GenericId<"workspaces">;
        isPublic: boolean;
        lastOpenedAt: number;
        version: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        thumbnailUrl: import("convex/values").VString<string | undefined, "optional">;
        workspaceId: import("convex/values").VId<import("convex/values").GenericId<"workspaces">, "required">;
        projectId: import("convex/values").VId<import("convex/values").GenericId<"projects"> | undefined, "optional">;
        ownerId: import("convex/values").VString<string, "required">;
        isPublic: import("convex/values").VBoolean<boolean, "required">;
        publicLinkId: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        lastOpenedAt: import("convex/values").VFloat64<number, "required">;
        archivedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        version: import("convex/values").VFloat64<number, "required">;
    }, "required", "name" | "createdAt" | "ownerId" | "updatedAt" | "workspaceId" | "archivedAt" | "thumbnailUrl" | "projectId" | "isPublic" | "publicLinkId" | "lastOpenedAt" | "version">, {
        by_workspace: ["workspaceId", "_creationTime"];
        by_project: ["projectId", "_creationTime"];
        by_owner: ["ownerId", "_creationTime"];
        by_workspace_not_archived: ["workspaceId", "archivedAt", "_creationTime"];
        by_public_link: ["publicLinkId", "_creationTime"];
        by_workspace_recent: ["workspaceId", "lastOpenedAt", "_creationTime"];
    }, {}, {}>;
    boardCollaborators: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: string;
        role: "viewer" | "editor";
        boardId: import("convex/values").GenericId<"boards">;
        addedAt: number;
        addedBy: string;
    }, {
        boardId: import("convex/values").VId<import("convex/values").GenericId<"boards">, "required">;
        userId: import("convex/values").VString<string, "required">;
        role: import("convex/values").VUnion<"viewer" | "editor", [import("convex/values").VLiteral<"editor", "required">, import("convex/values").VLiteral<"viewer", "required">], "required", never>;
        addedAt: import("convex/values").VFloat64<number, "required">;
        addedBy: import("convex/values").VString<string, "required">;
    }, "required", "userId" | "role" | "boardId" | "addedAt" | "addedBy">, {
        by_board: ["boardId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_board_and_user: ["boardId", "userId", "_creationTime"];
    }, {}, {}>;
    boardContent: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt: number;
        version: number;
        boardId: import("convex/values").GenericId<"boards">;
        ciphertext: ArrayBuffer;
        iv: ArrayBuffer;
        updatedBy: string;
        checksum: string;
    }, {
        boardId: import("convex/values").VId<import("convex/values").GenericId<"boards">, "required">;
        ciphertext: import("convex/values").VBytes<ArrayBuffer, "required">;
        iv: import("convex/values").VBytes<ArrayBuffer, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        updatedBy: import("convex/values").VString<string, "required">;
        version: import("convex/values").VFloat64<number, "required">;
        checksum: import("convex/values").VString<string, "required">;
    }, "required", "updatedAt" | "version" | "boardId" | "ciphertext" | "iv" | "updatedBy" | "checksum">, {
        by_board: ["boardId", "_creationTime"];
    }, {}, {}>;
    boardVersions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        note?: string | undefined;
        createdAt: number;
        version: number;
        boardId: import("convex/values").GenericId<"boards">;
        ciphertext: ArrayBuffer;
        iv: ArrayBuffer;
        createdBy: string;
        isAutoSave: boolean;
        sizeBytes: number;
    }, {
        boardId: import("convex/values").VId<import("convex/values").GenericId<"boards">, "required">;
        ciphertext: import("convex/values").VBytes<ArrayBuffer, "required">;
        iv: import("convex/values").VBytes<ArrayBuffer, "required">;
        version: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        createdBy: import("convex/values").VString<string, "required">;
        note: import("convex/values").VString<string | undefined, "optional">;
        isAutoSave: import("convex/values").VBoolean<boolean, "required">;
        sizeBytes: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "version" | "boardId" | "ciphertext" | "iv" | "createdBy" | "note" | "isAutoSave" | "sizeBytes">, {
        by_board: ["boardId", "_creationTime"];
        by_board_and_version: ["boardId", "version", "_creationTime"];
    }, {}, {}>;
    files: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        boardId: import("convex/values").GenericId<"boards">;
        createdBy: string;
        sizeBytes: number;
        fileId: string;
        firebaseStorageUrl: string;
        firebaseStoragePath: string;
        mimeType: string;
    }, {
        fileId: import("convex/values").VString<string, "required">;
        boardId: import("convex/values").VId<import("convex/values").GenericId<"boards">, "required">;
        firebaseStorageUrl: import("convex/values").VString<string, "required">;
        firebaseStoragePath: import("convex/values").VString<string, "required">;
        mimeType: import("convex/values").VString<string, "required">;
        sizeBytes: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        createdBy: import("convex/values").VString<string, "required">;
    }, "required", "createdAt" | "boardId" | "createdBy" | "sizeBytes" | "fileId" | "firebaseStorageUrl" | "firebaseStoragePath" | "mimeType">, {
        by_board: ["boardId", "_creationTime"];
        by_file_id: ["fileId", "_creationTime"];
    }, {}, {}>;
    templates: import("convex/server").TableDefinition<import("convex/values").VObject<{
        workspaceId?: import("convex/values").GenericId<"workspaces"> | undefined;
        description?: string | undefined;
        thumbnailUrl?: string | undefined;
        createdBy?: string | undefined;
        name: string;
        createdAt: number;
        ciphertext: ArrayBuffer;
        iv: ArrayBuffer;
        category: string;
        isBuiltIn: boolean;
        usageCount: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        category: import("convex/values").VString<string, "required">;
        thumbnailUrl: import("convex/values").VString<string | undefined, "optional">;
        ciphertext: import("convex/values").VBytes<ArrayBuffer, "required">;
        iv: import("convex/values").VBytes<ArrayBuffer, "required">;
        isBuiltIn: import("convex/values").VBoolean<boolean, "required">;
        workspaceId: import("convex/values").VId<import("convex/values").GenericId<"workspaces"> | undefined, "optional">;
        createdBy: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        usageCount: import("convex/values").VFloat64<number, "required">;
    }, "required", "name" | "createdAt" | "workspaceId" | "description" | "thumbnailUrl" | "ciphertext" | "iv" | "createdBy" | "category" | "isBuiltIn" | "usageCount">, {
        by_built_in: ["isBuiltIn", "_creationTime"];
        by_workspace: ["workspaceId", "_creationTime"];
        by_category: ["category", "_creationTime"];
        by_category_and_usage: ["category", "usageCount", "_creationTime"];
    }, {}, {}>;
    collaborationSessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userPhotoUrl?: string | undefined;
        cursorX?: number | undefined;
        cursorY?: number | undefined;
        userId: string;
        joinedAt: number;
        boardId: import("convex/values").GenericId<"boards">;
        userName: string;
        isActive: boolean;
        lastHeartbeat: number;
    }, {
        boardId: import("convex/values").VId<import("convex/values").GenericId<"boards">, "required">;
        userId: import("convex/values").VString<string, "required">;
        userName: import("convex/values").VString<string, "required">;
        userPhotoUrl: import("convex/values").VString<string | undefined, "optional">;
        cursorX: import("convex/values").VFloat64<number | undefined, "optional">;
        cursorY: import("convex/values").VFloat64<number | undefined, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        lastHeartbeat: import("convex/values").VFloat64<number, "required">;
        joinedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "joinedAt" | "boardId" | "userName" | "userPhotoUrl" | "cursorX" | "cursorY" | "isActive" | "lastHeartbeat">, {
        by_board: ["boardId", "_creationTime"];
        by_board_active: ["boardId", "isActive", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_board_and_user: ["boardId", "userId", "_creationTime"];
    }, {}, {}>;
    aiUsage: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: string;
        dailyTokensUsed: number;
        monthlyTokensUsed: number;
        lastDailyReset: number;
        lastMonthlyReset: string;
    }, {
        userId: import("convex/values").VString<string, "required">;
        dailyTokensUsed: import("convex/values").VFloat64<number, "required">;
        monthlyTokensUsed: import("convex/values").VFloat64<number, "required">;
        lastDailyReset: import("convex/values").VFloat64<number, "required">;
        lastMonthlyReset: import("convex/values").VString<string, "required">;
    }, "required", "userId" | "dailyTokensUsed" | "monthlyTokensUsed" | "lastDailyReset" | "lastMonthlyReset">, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    conflictLogs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: string;
        boardId: import("convex/values").GenericId<"boards">;
        localVersion: number;
        remoteVersion: number;
        localChecksum: string;
        remoteChecksum: string;
        resolution: "keep_local" | "keep_remote" | "merge" | "restore";
        timestamp: number;
    }, {
        boardId: import("convex/values").VId<import("convex/values").GenericId<"boards">, "required">;
        userId: import("convex/values").VString<string, "required">;
        localVersion: import("convex/values").VFloat64<number, "required">;
        remoteVersion: import("convex/values").VFloat64<number, "required">;
        localChecksum: import("convex/values").VString<string, "required">;
        remoteChecksum: import("convex/values").VString<string, "required">;
        resolution: import("convex/values").VUnion<"keep_local" | "keep_remote" | "merge" | "restore", [import("convex/values").VLiteral<"keep_local", "required">, import("convex/values").VLiteral<"keep_remote", "required">, import("convex/values").VLiteral<"merge", "required">, import("convex/values").VLiteral<"restore", "required">], "required", never>;
        timestamp: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "boardId" | "localVersion" | "remoteVersion" | "localChecksum" | "remoteChecksum" | "resolution" | "timestamp">, {
        by_board: ["boardId", "_creationTime"];
        by_timestamp: ["timestamp", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
