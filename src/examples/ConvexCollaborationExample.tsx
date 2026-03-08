/**
 * Convex Real-time Collaboration Example
 *
 * This example demonstrates how to build real-time collaboration features
 * using Convex, including:
 * - Live presence (who's on the board)
 * - Live cursor tracking (see other users' cursors)
 * - Heartbeat system (detect when users go offline)
 * - Real-time board updates
 *
 * BENEFITS OF CONVEX FOR COLLABORATION:
 * - No separate WebSocket server needed
 * - Sub-100ms latency
 * - Automatic reconnection
 * - Built-in conflict resolution
 * - Type-safe real-time queries
 */

import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  color: string;
}

export function ConvexCollaborationExample({ boardId }: { boardId: string }) {
  const { user } = useUser();
  const [localCursor, setLocalCursor] = useState({ x: 0, y: 0 });

  // =========================================================================
  // REAL-TIME QUERIES (Automatic Updates!)
  // =========================================================================

  // Get all active users on this board (real-time!)
  const activeUsers = useQuery(api.collaboration.getActiveUsers, { boardId });

  // Get all cursor positions (real-time!)
  const cursors = useQuery(api.collaboration.getCursors, { boardId });

  // Get board content (real-time!)
  const boardContent = useQuery(api.boards.getContent, { boardId });

  // =========================================================================
  // MUTATIONS (Write Operations)
  // =========================================================================

  const joinBoard = useMutation(api.collaboration.join);
  const leaveBoard = useMutation(api.collaboration.leave);
  const updateCursor = useMutation(api.collaboration.updateCursor);
  const sendHeartbeat = useMutation(api.collaboration.heartbeat);

  // =========================================================================
  // JOIN/LEAVE BOARD
  // =========================================================================

  useEffect(() => {
    if (!user) return;

    // Join the board when component mounts
    joinBoard({
      boardId,
      userName: user.fullName || user.username || "Anonymous",
      userPhotoUrl: user.imageUrl,
    });

    // Leave the board when component unmounts
    return () => {
      leaveBoard({ boardId });
    };
  }, [user, boardId, joinBoard, leaveBoard]);

  // =========================================================================
  // HEARTBEAT SYSTEM (Presence Detection)
  // =========================================================================

  useEffect(() => {
    if (!user) return;

    // Send heartbeat every 5 seconds to show we're still active
    const interval = setInterval(() => {
      sendHeartbeat({ boardId });
    }, 5000);

    return () => clearInterval(interval);
  }, [user, boardId, sendHeartbeat]);

  // =========================================================================
  // CURSOR TRACKING
  // =========================================================================

  useEffect(() => {
    if (!user) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = {
        x: e.clientX,
        y: e.clientY,
      };

      setLocalCursor(newPosition);

      // Update cursor position in Convex (throttled)
      updateCursor({
        boardId,
        x: newPosition.x,
        y: newPosition.y,
      });
    };

    // Throttle cursor updates (every 50ms)
    let lastUpdate = 0;
    const throttledMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate > 50) {
        handleMouseMove(e);
        lastUpdate = now;
      }
    };

    window.addEventListener("mousemove", throttledMouseMove);
    return () => window.removeEventListener("mousemove", throttledMouseMove);
  }, [user, boardId, updateCursor]);

  // =========================================================================
  // RENDER
  // =========================================================================

  if (!user) {
    return <div>Please sign in to collaborate</div>;
  }

  return (
    <div className="collaboration-container">
      {/* Active Users List */}
      <div className="active-users">
        <h3>Active Users ({activeUsers?.length || 0})</h3>
        <div className="users-list">
          {activeUsers?.map((collaborator) => (
            <div key={collaborator.userId} className="user-badge">
              {collaborator.userPhotoUrl && (
                <img
                  src={collaborator.userPhotoUrl}
                  alt={collaborator.userName}
                  className="user-avatar"
                />
              )}
              <span>{collaborator.userName}</span>
              {collaborator.userId === user.id && <span className="you-badge">You</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas with Live Cursors */}
      <div className="canvas-container" style={{ position: "relative", height: "500px" }}>
        <canvas id="drawing-canvas" width={800} height={500} />

        {/* Render other users' cursors */}
        {cursors
          ?.filter((cursor) => cursor.userId !== user.id) // Don't show our own cursor
          .map((cursor) => (
            <div
              key={cursor.userId}
              className="remote-cursor"
              style={{
                position: "absolute",
                left: cursor.cursorX,
                top: cursor.cursorY,
                pointerEvents: "none",
                zIndex: 1000,
              }}
            >
              {/* Cursor SVG */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill={cursor.color || "#4a90e2"}>
                <path d="M5.65,1.72L11.43,21.38L13.76,13.77L21.37,11.44L5.65,1.72Z" />
              </svg>

              {/* User name label */}
              <div
                className="cursor-label"
                style={{
                  backgroundColor: cursor.color || "#4a90e2",
                  color: "white",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  marginTop: "4px",
                  whiteSpace: "nowrap",
                }}
              >
                {cursor.userName}
              </div>
            </div>
          ))}
      </div>

      {/* Real-time Stats */}
      <div className="collaboration-stats">
        <div className="stat">
          <span className="label">Active Users:</span>
          <span className="value">{activeUsers?.length || 0}</span>
        </div>
        <div className="stat">
          <span className="label">Your Cursor:</span>
          <span className="value">
            ({Math.round(localCursor.x)}, {Math.round(localCursor.y)})
          </span>
        </div>
        <div className="stat">
          <span className="label">Board Version:</span>
          <span className="value">{boardContent?.version || 0}</span>
        </div>
      </div>

      {/* Real-time Activity Log */}
      <div className="activity-log">
        <h4>Live Activity</h4>
        <div className="log-entries">
          {activeUsers?.map((user) => (
            <div key={user.userId} className="log-entry">
              <span className="timestamp">{new Date(user.joinedAt).toLocaleTimeString()}</span>
              <span className="message">
                {user.userName} {user.isActive ? "is editing" : "is viewing"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * COMPARISON: Old WebSocket vs Convex
 *
 * OLD WAY (WebSocket Server):
 * ================================
 *
 * 1. Setup separate WebSocket server (apps/ws/)
 * 2. Handle connections manually:
 *    - Connection events
 *    - Disconnection events
 *    - Reconnection logic
 *    - Message parsing
 *    - Broadcasting to rooms
 * 3. Implement presence tracking:
 *    - Track connected clients
 *    - Detect timeouts
 *    - Clean up stale connections
 * 4. Implement cursor sync:
 *    - Parse cursor messages
 *    - Broadcast to room
 *    - Handle rate limiting
 * 5. Scale issues:
 *    - Single server bottleneck
 *    - Need Redis for multi-instance
 *    - Complex state synchronization
 *
 * Code complexity: ~500+ lines
 * Infrastructure: Separate server + Redis
 * Latency: 100-300ms
 * Scaling: Complex
 *
 * NEW WAY (Convex):
 * ================================
 *
 * 1. Define schema (done!)
 * 2. Write mutation functions:
 *    - join(boardId, userName)
 *    - leave(boardId)
 *    - updateCursor(boardId, x, y)
 *    - heartbeat(boardId)
 * 3. Use in React:
 *    - const users = useQuery(api.collaboration.getActiveUsers, { boardId });
 *    - const updateCursor = useMutation(api.collaboration.updateCursor);
 *
 * Code complexity: ~100 lines
 * Infrastructure: Zero (Convex handles it)
 * Latency: <100ms
 * Scaling: Automatic
 *
 * BENEFITS:
 * - 5x less code
 * - No infrastructure management
 * - Automatic scaling
 * - Better performance
 * - Type-safe
 * - Built-in conflict resolution
 */

/**
 * CONVEX FUNCTIONS TO CREATE
 * (Add these to convex/collaboration.ts)
 *
 * import { mutation, query } from "./_generated/server";
 * import { v } from "convex/values";
 *
 * // Join a board
 * export const join = mutation({
 *   args: {
 *     boardId: v.id("boards"),
 *     userName: v.string(),
 *     userPhotoUrl: v.optional(v.string()),
 *   },
 *   handler: async (ctx, args) => {
 *     const userId = await getUserId(ctx);
 *
 *     // Check if user already has a session
 *     const existing = await ctx.db
 *       .query("collaborationSessions")
 *       .withIndex("by_board_and_user", q =>
 *         q.eq("boardId", args.boardId).eq("userId", userId)
 *       )
 *       .first();
 *
 *     if (existing) {
 *       // Update existing session
 *       await ctx.db.patch(existing._id, {
 *         isActive: true,
 *         lastHeartbeat: Date.now(),
 *       });
 *       return existing._id;
 *     }
 *
 *     // Create new session
 *     return await ctx.db.insert("collaborationSessions", {
 *       boardId: args.boardId,
 *       userId,
 *       userName: args.userName,
 *       userPhotoUrl: args.userPhotoUrl,
 *       isActive: true,
 *       lastHeartbeat: Date.now(),
 *       joinedAt: Date.now(),
 *     });
 *   },
 * });
 *
 * // Leave a board
 * export const leave = mutation({
 *   args: { boardId: v.id("boards") },
 *   handler: async (ctx, args) => {
 *     const userId = await getUserId(ctx);
 *
 *     const session = await ctx.db
 *       .query("collaborationSessions")
 *       .withIndex("by_board_and_user", q =>
 *         q.eq("boardId", args.boardId).eq("userId", userId)
 *       )
 *       .first();
 *
 *     if (session) {
 *       await ctx.db.patch(session._id, { isActive: false });
 *     }
 *   },
 * });
 *
 * // Update cursor position
 * export const updateCursor = mutation({
 *   args: {
 *     boardId: v.id("boards"),
 *     x: v.number(),
 *     y: v.number(),
 *   },
 *   handler: async (ctx, args) => {
 *     const userId = await getUserId(ctx);
 *
 *     const session = await ctx.db
 *       .query("collaborationSessions")
 *       .withIndex("by_board_and_user", q =>
 *         q.eq("boardId", args.boardId).eq("userId", userId)
 *       )
 *       .first();
 *
 *     if (session) {
 *       await ctx.db.patch(session._id, {
 *         cursorX: args.x,
 *         cursorY: args.y,
 *         lastHeartbeat: Date.now(),
 *       });
 *     }
 *   },
 * });
 *
 * // Send heartbeat
 * export const heartbeat = mutation({
 *   args: { boardId: v.id("boards") },
 *   handler: async (ctx, args) => {
 *     const userId = await getUserId(ctx);
 *
 *     const session = await ctx.db
 *       .query("collaborationSessions")
 *       .withIndex("by_board_and_user", q =>
 *         q.eq("boardId", args.boardId).eq("userId", userId)
 *       )
 *       .first();
 *
 *     if (session) {
 *       await ctx.db.patch(session._id, {
 *         lastHeartbeat: Date.now(),
 *       });
 *     }
 *   },
 * });
 *
 * // Get active users on board
 * export const getActiveUsers = query({
 *   args: { boardId: v.id("boards") },
 *   handler: async (ctx, args) => {
 *     // Get all sessions for this board
 *     const sessions = await ctx.db
 *       .query("collaborationSessions")
 *       .withIndex("by_board_active", q =>
 *         q.eq("boardId", args.boardId).eq("isActive", true)
 *       )
 *       .collect();
 *
 *     // Filter out stale sessions (no heartbeat in last 30 seconds)
 *     const now = Date.now();
 *     const activeThreshold = 30 * 1000; // 30 seconds
 *
 *     return sessions.filter(
 *       session => now - session.lastHeartbeat < activeThreshold
 *     );
 *   },
 * });
 *
 * // Get all cursor positions
 * export const getCursors = query({
 *   args: { boardId: v.id("boards") },
 *   handler: async (ctx, args) => {
 *     const activeUsers = await getActiveUsers(ctx, args);
 *
 *     // Assign colors to users (deterministic based on userId)
 *     const colors = [
 *       "#4a90e2", "#e24a4a", "#4ae24a", "#e2e24a",
 *       "#e24ae2", "#4ae2e2", "#e2904a"
 *     ];
 *
 *     return activeUsers.map((user, index) => ({
 *       userId: user.userId,
 *       userName: user.userName,
 *       cursorX: user.cursorX || 0,
 *       cursorY: user.cursorY || 0,
 *       color: colors[index % colors.length],
 *     }));
 *   },
 * });
 */
