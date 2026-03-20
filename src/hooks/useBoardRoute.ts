import { useParams } from "react-router-dom";

/**
 * Extracts workspace and board IDs from the route /workspace/:workspaceId/board/:boardId.
 * Returns null if not on a board route.
 */
export function useBoardRoute() {
  const { workspaceId, boardId } = useParams<{
    workspaceId: string;
    boardId: string;
  }>();

  if (workspaceId && boardId) {
    return { workspaceId, boardId };
  }
  return null;
}
