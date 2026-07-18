import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type DatabaseCtx = Pick<QueryCtx | MutationCtx, "db">;

const validateAccessToken = (accessToken: string | undefined) => {
  if (accessToken !== undefined && (accessToken.length < 32 || accessToken.length > 128)) {
    throw new Error("Invalid access token");
  }
};

/**
 * Verify a room access proof without receiving the room encryption key.
 * Rooms created before the Convex-only cutover do not have a proof; they are
 * claimed on their first authenticated-by-link write.
 */
export const assertRoomAccess = async (
  ctx: DatabaseCtx,
  roomId: string,
  accessToken: string | undefined,
) => {
  validateAccessToken(accessToken);

  const room = await ctx.db
    .query("collaborativeRooms")
    .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
    .first();

  if (!room) {
    throw new Error("Room not found");
  }

  if (room.accessToken !== undefined && room.accessToken !== accessToken) {
    throw new Error("Access denied");
  }

  return room;
};

export const assertPublicShareAccess = async (
  ctx: DatabaseCtx,
  shareId: Id<"publicShares">,
  accessToken: string | undefined,
) => {
  validateAccessToken(accessToken);

  const share = await ctx.db.get(shareId);
  if (!share) {
    throw new Error("Share not found");
  }

  if (share.accessToken !== undefined && share.accessToken !== accessToken) {
    throw new Error("Access denied");
  }

  return share;
};

export const assertLegacyShareAccess = async (
  ctx: DatabaseCtx,
  shortId: string,
  accessToken: string | undefined,
) => {
  validateAccessToken(accessToken);

  const share = await ctx.db
    .query("publicShares")
    .withIndex("by_short_id", (q) => q.eq("shortId", shortId))
    .first();

  if (!share) {
    throw new Error("Share not found");
  }

  if (share.accessToken !== undefined && share.accessToken !== accessToken) {
    throw new Error("Access denied");
  }

  return share;
};
