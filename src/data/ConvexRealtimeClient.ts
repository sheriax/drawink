import type { OnUserFollowedPayload, SocketId } from "@/core/types";
import { ConvexClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { WS_EVENTS } from "../app_constants";
import { deriveConvexAccessToken } from "./convexAccess";

type EventMap = {
  "init-room": () => void;
  "new-user": (sessionId: string) => void;
  "room-user-change": (sessionIds: SocketId[]) => void;
  "client-broadcast": (encryptedData: ArrayBuffer, iv: Uint8Array) => void;
  "first-in-room": () => void;
  connect_error: (error: Error) => void;
  [WS_EVENTS.USER_FOLLOW_ROOM_CHANGE]: (followedBy: SocketId[]) => void;
};

type EventName = keyof EventMap;
type EventArgs<Event extends EventName> = EventMap[Event] extends (...args: infer Args) => void
  ? Args
  : never;
type Listener = (...args: unknown[]) => void;

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL not configured");
}

const createSessionId = () => {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID() as SocketId;
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("") as SocketId;
};

export class ConvexRealtimeClient {
  readonly id = createSessionId();

  private readonly client = new ConvexClient(convexUrl);
  private readonly listeners = new Map<EventName, Set<Listener>>();
  private readonly roomId: string;
  private readonly userName: string;
  private readonly accessTokenPromise: Promise<string>;
  private readonly seenMessageIds = new Set<string>();
  private sessionIds: Set<string> | null = null;
  private followingSessionId: string | undefined;
  private joinedAt = 0;
  private heartbeatId: number | undefined;
  private unsubscribeMessages: (() => void) | undefined;
  private unsubscribeSessions: (() => void) | undefined;
  private joinPromise: Promise<void> | undefined;
  private joined = false;
  private closed = false;

  constructor(options: { roomId: string; roomKey: string; userName: string }) {
    this.roomId = options.roomId;
    this.userName = options.userName;
    this.accessTokenPromise = deriveConvexAccessToken("room", options.roomKey);

    queueMicrotask(() => this.dispatch("init-room"));
  }

  on<Event extends EventName>(event: Event, listener: EventMap[Event]) {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener as unknown as Listener);
    this.listeners.set(event, listeners);
    return this;
  }

  waitUntilReady() {
    return this.ensureJoined();
  }

  once<Event extends EventName>(event: Event, listener: EventMap[Event]) {
    const onceListener = ((...args: EventArgs<Event>) => {
      this.off(event, onceListener as EventMap[Event]);
      const typedListener = listener as (...listenerArgs: EventArgs<Event>) => void;
      typedListener(...args);
    }) as EventMap[Event];
    return this.on(event, onceListener);
  }

  off<Event extends EventName>(event: Event, listener?: EventMap[Event]) {
    if (!listener) {
      this.listeners.delete(event);
      return this;
    }

    const listeners = this.listeners.get(event);
    listeners?.delete(listener as unknown as Listener);
    if (listeners?.size === 0) {
      this.listeners.delete(event);
    }
    return this;
  }

  emit(event: "join-room", roomId: string): this;
  emit(
    event: typeof WS_EVENTS.SERVER | typeof WS_EVENTS.SERVER_VOLATILE,
    channel: string,
    encryptedData: ArrayBuffer,
    iv: Uint8Array,
  ): this;
  emit(event: typeof WS_EVENTS.USER_FOLLOW_CHANGE, payload: OnUserFollowedPayload): this;
  emit(event: string, ...args: unknown[]) {
    if (this.closed) {
      return this;
    }

    if (event === "join-room") {
      const [roomId] = args as [string];
      if (roomId === this.roomId) {
        this.ensureJoined();
      }
      return this;
    }

    if (event === WS_EVENTS.SERVER || event === WS_EVENTS.SERVER_VOLATILE) {
      const [channel, encryptedData, iv] = args as [string, ArrayBuffer, Uint8Array];
      void this.publish(channel, encryptedData, iv, event === WS_EVENTS.SERVER_VOLATILE);
      return this;
    }

    if (event === WS_EVENTS.USER_FOLLOW_CHANGE) {
      const [payload] = args as [OnUserFollowedPayload];
      void this.updateFollowing(payload);
    }

    return this;
  }

  close() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.unsubscribeMessages?.();
    this.unsubscribeSessions?.();
    if (this.heartbeatId !== undefined) {
      window.clearInterval(this.heartbeatId);
    }

    void (async () => {
      try {
        await this.joinPromise;
        if (this.joined) {
          const accessToken = await this.accessTokenPromise;
          await this.client.mutation(api.realtime.leaveRoom, {
            roomId: this.roomId,
            accessToken,
            sessionId: this.id,
          });
        }
      } catch {
        // Closing is best-effort. Stale sessions also expire server-side.
      } finally {
        this.client.close();
      }
    })();
    this.listeners.clear();
  }

  private dispatch<Event extends EventName>(event: Event, ...args: EventArgs<Event>) {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      const typedListener = listener as (...listenerArgs: EventArgs<Event>) => void;
      typedListener(...args);
    }
  }

  private reportError = (error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    this.dispatch("connect_error", normalized);
  };

  private ensureJoined() {
    if (this.closed) {
      return Promise.reject(new Error("Realtime client is closed"));
    }
    if (this.joinPromise) {
      return this.joinPromise;
    }

    const joinPromise = this.join();
    this.joinPromise = joinPromise;
    void joinPromise.catch((error) => {
      if (this.joinPromise === joinPromise) {
        this.joinPromise = undefined;
      }
      this.reportError(error);
    });
    return joinPromise;
  }

  private async join() {
    const accessToken = await this.accessTokenPromise;
    this.joinedAt = Date.now();
    const result = await this.client.mutation(api.realtime.joinRoom, {
      roomId: this.roomId,
      accessToken,
      sessionId: this.id,
      userName: this.userName,
    });
    this.joined = true;

    if (this.closed) {
      return;
    }

    this.subscribe(accessToken);
    this.heartbeatId = window.setInterval(() => {
      void this.client
        .mutation(api.realtime.heartbeat, {
          roomId: this.roomId,
          accessToken,
          sessionId: this.id,
        })
        .catch(this.reportError);
    }, 10_000);

    if (result.activeCount <= 1) {
      this.dispatch("first-in-room");
    }
  }

  private subscribe(accessToken: string) {
    this.unsubscribeMessages = this.client.onUpdate(
      api.realtime.listRoomMessages,
      { roomId: this.roomId, accessToken, sessionId: this.id },
      (messages) => {
        for (const message of messages) {
          if (this.seenMessageIds.has(message._id)) {
            continue;
          }
          this.seenMessageIds.add(message._id);

          const isDirectRoomMessage = message.channel === this.roomId;
          const isFollowMessage =
            this.followingSessionId !== undefined &&
            message.channel === `follow@${this.followingSessionId}`;
          if (
            message.senderSessionId !== this.id &&
            message.createdAt >= this.joinedAt - 1_000 &&
            (isDirectRoomMessage || isFollowMessage)
          ) {
            this.dispatch("client-broadcast", message.encryptedData, new Uint8Array(message.iv));
          }
        }

        if (this.seenMessageIds.size > 500) {
          const retained = Array.from(this.seenMessageIds).slice(-250);
          this.seenMessageIds.clear();
          for (const id of retained) {
            this.seenMessageIds.add(id);
          }
        }
      },
      this.reportError,
    );

    this.unsubscribeSessions = this.client.onUpdate(
      api.realtime.listRoomSessions,
      { roomId: this.roomId, accessToken, sessionId: this.id },
      (sessions) => {
        const nextSessionIds = new Set(sessions.map((session) => session.sessionId));
        if (this.sessionIds) {
          for (const sessionId of nextSessionIds) {
            if (!this.sessionIds.has(sessionId) && sessionId !== this.id) {
              this.dispatch("new-user", sessionId);
            }
          }
        }
        this.sessionIds = nextSessionIds;

        this.dispatch("room-user-change", Array.from(nextSessionIds) as SocketId[]);
        this.dispatch(
          WS_EVENTS.USER_FOLLOW_ROOM_CHANGE,
          sessions
            .filter((session) => session.followingSessionId === this.id)
            .map((session) => session.sessionId as SocketId),
        );
      },
      this.reportError,
    );
  }

  private async publish(
    channel: string,
    encryptedData: ArrayBuffer,
    iv: Uint8Array,
    isVolatile: boolean,
  ) {
    try {
      await this.ensureJoined();
      const accessToken = await this.accessTokenPromise;
      await this.client.mutation(api.realtime.publishRoomMessage, {
        roomId: this.roomId,
        accessToken,
        sessionId: this.id,
        channel,
        encryptedData,
        iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
        isVolatile,
      });
    } catch (error) {
      this.reportError(error);
    }
  }

  private async updateFollowing(payload: OnUserFollowedPayload) {
    this.followingSessionId =
      payload.action === "FOLLOW" ? payload.userToFollow.socketId : undefined;
    try {
      await this.ensureJoined();
      const accessToken = await this.accessTokenPromise;
      await this.client.mutation(api.realtime.updateFollowing, {
        roomId: this.roomId,
        accessToken,
        sessionId: this.id,
        followingSessionId: this.followingSessionId,
      });
    } catch (error) {
      this.reportError(error);
    }
  }
}

export const createConvexRealtimeClient = (options: {
  roomId: string;
  roomKey: string;
  userName: string;
}) => new ConvexRealtimeClient(options);
