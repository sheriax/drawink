/**
 * React hooks for Convex real-time collaboration
 *
 * Features:
 * - Live presence tracking
 * - Real-time cursor synchronization
 * - Automatic heartbeat system
 * - Session management
 */

import { useConvex, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Hook to manage collaboration session for a board
 */
export function useCollaborationSession(
  boardId: Id<"boards"> | null,
  userName: string,
  userPhotoUrl?: string,
) {
  const convex = useConvex();
  const join = useMutation(api.collaboration.join);
  const leave = useMutation(api.collaboration.leave);
  const heartbeat = useMutation(api.collaboration.heartbeat);

  const [sessionId, setSessionId] = useState<Id<"collaborationSessions"> | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Join board when component mounts or boardId changes
  useEffect(() => {
    if (!boardId || !userName) return;

    let isActive = true;

    // Join the board
    join({ boardId, userName, userPhotoUrl })
      .then((id) => {
        if (isActive) {
          setSessionId(id);
        }
      })
      .catch((error) => {
        console.error("[Collab] Failed to join board:", error);
      });

    // Cleanup: leave board when component unmounts
    return () => {
      isActive = false;
      if (boardId) {
        leave({ boardId }).catch((error) => {
          console.error("[Collab] Failed to leave board:", error);
        });
      }
    };
  }, [boardId, userName, userPhotoUrl, join, leave]);

  // Start heartbeat to keep session alive
  useEffect(() => {
    if (!boardId || !sessionId) return;

    // Send heartbeat every 10 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      heartbeat({ boardId }).catch((error) => {
        console.error("[Collab] Heartbeat failed:", error);
      });
    }, 10 * 1000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [boardId, sessionId, heartbeat]);

  return {
    sessionId,
    isJoined: !!sessionId,
  };
}

/**
 * Hook to track active collaborators on a board (real-time!)
 */
export function useActiveCollaborators(boardId: Id<"boards"> | null) {
  const activeUsers = useQuery(api.collaboration.getActiveUsers, boardId ? { boardId } : "skip");

  return {
    collaborators: activeUsers || [],
    count: activeUsers?.length || 0,
  };
}

/**
 * Hook to track all cursor positions (real-time!)
 */
export function useCursorTracking(boardId: Id<"boards"> | null) {
  const cursors = useQuery(api.collaboration.getCursors, boardId ? { boardId } : "skip");

  return cursors || [];
}

/**
 * Hook to update cursor position
 */
export function useCursorUpdate(boardId: Id<"boards"> | null) {
  const updateCursor = useMutation(api.collaboration.updateCursor);
  const lastUpdateRef = useRef<{ x: number; y: number } | null>(null);

  const update = useCallback(
    (x: number, y: number) => {
      if (!boardId) return;

      // Throttle cursor updates (don't send if position hasn't changed much)
      const last = lastUpdateRef.current;
      if (last && Math.abs(last.x - x) < 5 && Math.abs(last.y - y) < 5) {
        return;
      }

      lastUpdateRef.current = { x, y };
      updateCursor({ boardId, x, y }).catch((error) => {
        console.error("[Collab] Failed to update cursor:", error);
      });
    },
    [boardId, updateCursor],
  );

  return update;
}

/**
 * Hook to get collaboration statistics
 */
export function useCollaborationStats(boardId: Id<"boards"> | null) {
  const stats = useQuery(api.collaboration.getStats, boardId ? { boardId } : "skip");

  return (
    stats || {
      activeCount: 0,
      totalCollaborators: 0,
      currentSessions: [],
    }
  );
}

/**
 * All-in-one hook for complete collaboration features
 */
export function useCollaboration(
  boardId: Id<"boards"> | null,
  userName: string,
  userPhotoUrl?: string,
) {
  const session = useCollaborationSession(boardId, userName, userPhotoUrl);
  const { collaborators, count } = useActiveCollaborators(boardId);
  const cursors = useCursorTracking(boardId);
  const updateCursor = useCursorUpdate(boardId);
  const stats = useCollaborationStats(boardId);

  return {
    // Session
    sessionId: session.sessionId,
    isJoined: session.isJoined,

    // Collaborators
    collaborators,
    collaboratorCount: count,

    // Cursors
    cursors,
    updateCursor,

    // Stats
    stats,
  };
}
