/**
 * Workspace Invitations
 *
 * Email-based invitation flow using Resend for delivery.
 * Supports: create, accept, decline, revoke, list, and auto-apply on signup.
 */

import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// =========================================================================
// HELPERS
// =========================================================================

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// =========================================================================
// MUTATIONS
// =========================================================================

/**
 * Create an invitation and send the email.
 * Only owner/admin of team-tier workspaces can invite.
 */
export const createInvitation = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  returns: v.object({
    invitationId: v.id("workspaceInvitations"),
    token: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    if (workspace.subscriptionTier !== "team") {
      throw new Error("Only team-tier workspaces can invite members");
    }

    // Check caller is owner or admin
    const isOwner = workspace.ownerId === identity.subject;
    const callerMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", identity.subject),
      )
      .first();
    if (!isOwner && callerMembership?.role !== "admin") {
      throw new Error("Only owner or admin can invite members");
    }

    const email = args.email.trim().toLowerCase();

    // Can't invite yourself
    if (identity.email?.toLowerCase() === email) {
      throw new Error("You cannot invite yourself");
    }

    // Check if already a member (if user exists)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existingUser) {
      const existingMember = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("userId", existingUser.clerkId),
        )
        .first();
      if (existingMember) {
        throw new Error("This user is already a member of the workspace");
      }
    }

    // Check for duplicate pending invitation
    const existingInvite = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace_and_email", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("email", email),
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (existingInvite && existingInvite.expiresAt > Date.now()) {
      throw new Error("A pending invitation already exists for this email");
    }

    // Rate limit: max 20 invitations per hour per user
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentInvites = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace_and_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "pending"),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("invitedBy"), identity.subject),
          q.gte(q.field("createdAt"), oneHourAgo),
        ),
      )
      .collect();
    if (recentInvites.length >= 20) {
      throw new Error("Too many invitations sent. Please try again later.");
    }

    const now = Date.now();
    const token = generateToken();

    const invitationId = await ctx.db.insert("workspaceInvitations", {
      workspaceId: args.workspaceId,
      email,
      role: args.role,
      invitedBy: identity.subject,
      token,
      status: "pending",
      createdAt: now,
      expiresAt: now + SEVEN_DAYS_MS,
    });

    // Schedule email sending (action defined in invitationEmail.ts)
    await ctx.scheduler.runAfter(0, internal.invitationEmail.sendInvitationEmail, {
      invitationId,
    });

    return { invitationId, token };
  },
});

/**
 * Accept an invitation. Caller must be authenticated and email must match.
 */
export const acceptInvitation = mutation({
  args: { token: v.string() },
  returns: v.id("workspaces"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized — please sign in first");

    const invitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!invitation) throw new Error("Invitation not found");

    if (invitation.status !== "pending") {
      throw new Error(`This invitation has already been ${invitation.status}`);
    }
    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("This invitation has expired");
    }

    // Verify email matches
    const userEmail = identity.email?.toLowerCase();
    if (userEmail !== invitation.email) {
      throw new Error(
        `This invitation was sent to ${invitation.email}. Please sign in with that email address.`,
      );
    }

    // Check not already a member
    const existingMember = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", invitation.workspaceId).eq("userId", identity.subject),
      )
      .first();
    if (existingMember) {
      await ctx.db.patch(invitation._id, {
        status: "accepted",
        respondedAt: Date.now(),
      });
      return invitation.workspaceId;
    }

    const workspace = await ctx.db.get(invitation.workspaceId);
    if (!workspace) throw new Error("Workspace no longer exists");

    const now = Date.now();

    // Add as member
    await ctx.db.insert("workspaceMembers", {
      workspaceId: invitation.workspaceId,
      userId: identity.subject,
      role: invitation.role,
      joinedAt: now,
    });

    // Update member count
    await ctx.db.patch(invitation.workspaceId, {
      memberCount: workspace.memberCount + 1,
      updatedAt: now,
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      respondedAt: now,
    });

    return invitation.workspaceId;
  },
});

/**
 * Decline an invitation.
 */
export const declineInvitation = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const invitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.status !== "pending") return;

    await ctx.db.patch(invitation._id, {
      status: "declined",
      respondedAt: Date.now(),
    });
  },
});

/**
 * Revoke a pending invitation. Only workspace owner/admin.
 */
export const revokeInvitation = mutation({
  args: { invitationId: v.id("workspaceInvitations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.status !== "pending") return;

    const workspace = await ctx.db.get(invitation.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const isOwner = workspace.ownerId === identity.subject;
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", invitation.workspaceId).eq("userId", identity.subject),
      )
      .first();
    if (!isOwner && membership?.role !== "admin") {
      throw new Error("Only owner or admin can revoke invitations");
    }

    await ctx.db.patch(args.invitationId, {
      status: "expired",
      respondedAt: Date.now(),
    });
  },
});

// =========================================================================
// QUERIES
// =========================================================================

/**
 * List pending invitations for a workspace. Owner/admin only.
 */
export const listPendingForWorkspace = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return [];

    const isOwner = workspace.ownerId === identity.subject;
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", identity.subject),
      )
      .first();
    if (!isOwner && membership?.role !== "admin") return [];

    const invitations = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_workspace_and_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "pending"),
      )
      .collect();

    const now = Date.now();

    // Enrich with inviter name and filter expired
    const results = [];
    for (const inv of invitations) {
      if (inv.expiresAt < now) continue;
      const inviter = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", inv.invitedBy))
        .first();
      results.push({
        ...inv,
        inviterName: inviter?.name || "Unknown",
      });
    }
    return results;
  },
});

/**
 * List pending invitations for the current user (by email).
 */
export const listPendingForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) return [];

    const email = identity.email.toLowerCase();
    const now = Date.now();

    const invitations = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const results = [];
    for (const inv of invitations) {
      if (inv.expiresAt < now) continue;
      const workspace = await ctx.db.get(inv.workspaceId);
      const inviter = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", inv.invitedBy))
        .first();
      if (!workspace) continue;
      results.push({
        _id: inv._id,
        token: inv.token,
        role: inv.role,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        workspaceName: workspace.name,
        workspaceIcon: workspace.icon,
        workspaceColor: workspace.color,
        inviterName: inviter?.name || "Unknown",
      });
    }
    return results;
  },
});

/**
 * Get invitation details by token (for the accept page).
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!invitation) return null;

    const workspace = await ctx.db.get(invitation.workspaceId);
    const inviter = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", invitation.invitedBy))
      .first();

    return {
      status: invitation.status,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      workspaceName: workspace?.name || "Unknown Workspace",
      workspaceIcon: workspace?.icon,
      inviterName: inviter?.name || "Someone",
    };
  },
});

// =========================================================================
// INTERNAL: Auto-apply invitations on signup
// =========================================================================

/**
 * Called from Clerk webhook on user.created to auto-accept pending invitations.
 */
export const applyPendingInvitations = internalMutation({
  args: { email: v.string(), clerkId: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const now = Date.now();

    const pendingInvites = await ctx.db
      .query("workspaceInvitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    for (const inv of pendingInvites) {
      if (inv.expiresAt < now) continue;

      const workspace = await ctx.db.get(inv.workspaceId);
      if (!workspace) continue;

      // Check not already a member
      const existing = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace_and_user", (q) =>
          q.eq("workspaceId", inv.workspaceId).eq("userId", args.clerkId),
        )
        .first();
      if (existing) {
        await ctx.db.patch(inv._id, { status: "accepted", respondedAt: now });
        continue;
      }

      await ctx.db.insert("workspaceMembers", {
        workspaceId: inv.workspaceId,
        userId: args.clerkId,
        role: inv.role,
        joinedAt: now,
      });

      await ctx.db.patch(inv.workspaceId, {
        memberCount: workspace.memberCount + 1,
        updatedAt: now,
      });

      await ctx.db.patch(inv._id, { status: "accepted", respondedAt: now });
    }
  },
});

// =========================================================================
// INTERNAL QUERY (for action to read invitation data)
// =========================================================================

export const getInvitationData = internalQuery({
  args: { invitationId: v.id("workspaceInvitations") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) return null;

    const workspace = await ctx.db.get(invitation.workspaceId);
    const inviter = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", invitation.invitedBy))
      .first();

    return {
      email: invitation.email,
      token: invitation.token,
      workspaceName: workspace?.name || "A Workspace",
      inviterName: inviter?.name || "Someone",
    };
  },
});

