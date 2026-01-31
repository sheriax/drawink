/**
 * Convex Schema for Drawink
 *
 * This schema defines the database structure for Drawink using Convex.
 * Files are stored in Firebase Storage (cost-effective), while metadata
 * and board data are stored in Convex for reactive real-time updates.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // =========================================================================
  // USERS (synced from Clerk via webhook)
  // =========================================================================
  users: defineTable({
    clerkId: v.string(), // Clerk user ID (primary key)
    email: v.string(),
    name: v.string(),
    photoUrl: v.optional(v.string()),

    // Subscription info
    subscriptionTier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("team")
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionExpiresAt: v.optional(v.number()),

    // Metadata
    createdAt: v.number(),
    lastLoginAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // =========================================================================
  // WORKSPACES (Personal or Team)
  // =========================================================================
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.string(), // Clerk user ID

    // Organization link (if part of Clerk Organization)
    clerkOrgId: v.optional(v.string()),

    // Subscription (can be different from personal)
    subscriptionTier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("team")
    ),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    memberCount: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_clerk_org", ["clerkOrgId"]),

  // =========================================================================
  // WORKSPACE MEMBERS
  // =========================================================================
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(), // Clerk user ID
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    ),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  // =========================================================================
  // PROJECTS (Folders for organizing boards)
  // =========================================================================
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()), // Hex color for UI
    icon: v.optional(v.string()), // Emoji or icon name

    workspaceId: v.id("workspaces"),
    ownerId: v.string(), // Clerk user ID

    // Nested folders support (future)
    parentProjectId: v.optional(v.id("projects")),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()), // Soft delete
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_owner", ["ownerId"])
    .index("by_workspace_not_archived", ["workspaceId", "archivedAt"]),

  // =========================================================================
  // BOARDS (Main drawing canvas)
  // =========================================================================
  boards: defineTable({
    name: v.string(),

    // Firebase Storage URL for thumbnail (NOT stored in Convex!)
    thumbnailUrl: v.optional(v.string()),

    // Organization
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")), // Can be in a folder
    ownerId: v.string(), // Clerk user ID

    // Sharing
    isPublic: v.boolean(),
    publicLinkId: v.optional(v.string()), // For shareable links

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    lastOpenedAt: v.number(),
    archivedAt: v.optional(v.number()), // Soft delete

    // Version for conflict resolution
    version: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_owner", ["ownerId"])
    .index("by_workspace_not_archived", ["workspaceId", "archivedAt"])
    .index("by_public_link", ["publicLinkId"])
    .index("by_workspace_recent", ["workspaceId", "lastOpenedAt"]),

  // =========================================================================
  // BOARD COLLABORATORS (Direct board sharing)
  // =========================================================================
  boardCollaborators: defineTable({
    boardId: v.id("boards"),
    userId: v.string(), // Clerk user ID
    role: v.union(
      v.literal("editor"),
      v.literal("viewer")
    ),
    addedAt: v.number(),
    addedBy: v.string(), // Clerk user ID
  })
    .index("by_board", ["boardId"])
    .index("by_user", ["userId"])
    .index("by_board_and_user", ["boardId", "userId"]),

  // =========================================================================
  // BOARD CONTENT (Current state - encrypted)
  // =========================================================================
  boardContent: defineTable({
    boardId: v.id("boards"),

    // Encrypted content (AES-GCM encrypted JSON)
    // Contains: { elements: [], appState: {} }
    ciphertext: v.bytes(),
    iv: v.bytes(),

    // Metadata (not encrypted)
    updatedAt: v.number(),
    updatedBy: v.string(), // Clerk user ID
    version: v.number(),
    checksum: v.string(), // SHA-256 for conflict detection
  })
    .index("by_board", ["boardId"]),

  // =========================================================================
  // BOARD VERSIONS (Version history)
  // =========================================================================
  boardVersions: defineTable({
    boardId: v.id("boards"),

    // Encrypted content snapshot
    ciphertext: v.bytes(),
    iv: v.bytes(),

    // Metadata
    version: v.number(),
    createdAt: v.number(),
    createdBy: v.string(), // Clerk user ID
    note: v.optional(v.string()), // Optional version note
    isAutoSave: v.boolean(), // Auto vs manual save

    // Size for cleanup
    sizeBytes: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_board_and_version", ["boardId", "version"]),

  // =========================================================================
  // FILES (Metadata only - actual files in Firebase Storage)
  // =========================================================================
  files: defineTable({
    fileId: v.string(), // File ID used in elements
    boardId: v.id("boards"),

    // Firebase Storage reference
    firebaseStorageUrl: v.string(), // Full Firebase Storage URL
    firebaseStoragePath: v.string(), // Path for deletion

    // File info
    mimeType: v.string(),
    sizeBytes: v.number(),

    // Metadata
    createdAt: v.number(),
    createdBy: v.string(), // Clerk user ID
  })
    .index("by_board", ["boardId"])
    .index("by_file_id", ["fileId"]),

  // =========================================================================
  // TEMPLATES
  // =========================================================================
  templates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(), // "Flowchart", "Mindmap", "Wireframe", etc.

    // Firebase Storage URL for thumbnail
    thumbnailUrl: v.optional(v.string()),

    // Encrypted template content
    ciphertext: v.bytes(),
    iv: v.bytes(),

    // Ownership
    isBuiltIn: v.boolean(), // System template
    workspaceId: v.optional(v.id("workspaces")), // Org-specific
    createdBy: v.optional(v.string()), // User-created

    // Metadata
    createdAt: v.number(),
    usageCount: v.number(), // Popularity tracking
  })
    .index("by_built_in", ["isBuiltIn"])
    .index("by_workspace", ["workspaceId"])
    .index("by_category", ["category"])
    .index("by_category_and_usage", ["category", "usageCount"]),

  // =========================================================================
  // COLLABORATIVE ROOMS (Real-time collaboration scenes)
  // =========================================================================
  collaborativeRooms: defineTable({
    roomId: v.string(), // Public room ID (shared in URL)

    // Encrypted scene data (encrypted with roomKey on client)
    // Contains: { elements: [], appState: {} }
    ciphertext: v.bytes(),
    iv: v.bytes(),

    // Version tracking for conflict resolution
    sceneVersion: v.number(),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    lastEditedBy: v.optional(v.string()), // Optional Clerk user ID

    // Expiry (auto-cleanup after N days of inactivity)
    expiresAt: v.optional(v.number()),
  })
    .index("by_room_id", ["roomId"])
    .index("by_updated_at", ["updatedAt"]),

  // =========================================================================
  // COLLABORATION SESSIONS (Real-time presence)
  // =========================================================================
  collaborationSessions: defineTable({
    boardId: v.optional(v.id("boards")), // Personal board (if authenticated)
    roomId: v.optional(v.string()), // Collaborative room (if using real-time collab)

    userId: v.string(), // Clerk user ID or anonymous session ID
    userName: v.string(),
    userPhotoUrl: v.optional(v.string()),

    // Cursor position (for showing other users' cursors)
    cursorX: v.optional(v.number()),
    cursorY: v.optional(v.number()),

    // Status
    isActive: v.boolean(),
    lastHeartbeat: v.number(), // For presence detection

    // Session info
    joinedAt: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_room", ["roomId"])
    .index("by_board_active", ["boardId", "isActive"])
    .index("by_room_active", ["roomId", "isActive"])
    .index("by_user", ["userId"])
    .index("by_board_and_user", ["boardId", "userId"])
    .index("by_room_and_user", ["roomId", "userId"]),

  // =========================================================================
  // AI USAGE TRACKING
  // =========================================================================
  aiUsage: defineTable({
    userId: v.string(), // Clerk user ID

    // Usage stats
    dailyTokensUsed: v.number(),
    monthlyTokensUsed: v.number(),

    // Reset tracking
    lastDailyReset: v.number(),
    lastMonthlyReset: v.string(), // "2024-01" format
  })
    .index("by_user", ["userId"]),

  // =========================================================================
  // CONFLICT LOGS (for debugging sync issues)
  // =========================================================================
  conflictLogs: defineTable({
    boardId: v.id("boards"),
    userId: v.string(),

    localVersion: v.number(),
    remoteVersion: v.number(),
    localChecksum: v.string(),
    remoteChecksum: v.string(),

    resolution: v.union(
      v.literal("keep_local"),
      v.literal("keep_remote"),
      v.literal("merge"),
      v.literal("restore")
    ),

    timestamp: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_timestamp", ["timestamp"]),

  // =========================================================================
  // PUBLIC SHARES (Anonymous shareable links - NO AUTH REQUIRED)
  // =========================================================================
  publicShares: defineTable({
    // Encrypted payload (contains: encodingMetadataBuffer, iv, encryptedBuffer)
    // This is the full output from compressData() which includes everything needed
    // to decrypt and decompress using decompressData()
    payload: v.bytes(),

    // Optional short ID for backward compatibility
    shortId: v.optional(v.string()),

    // Metadata
    title: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),

    // Analytics
    viewCount: v.number(),
    lastViewedAt: v.optional(v.number()),
  })
    .index("by_short_id", ["shortId"])
    .index("by_created_at", ["createdAt"]),
});
