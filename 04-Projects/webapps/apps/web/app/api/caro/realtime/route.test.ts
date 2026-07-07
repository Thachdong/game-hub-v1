import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = new Map<string, string>();
const getSessionStatusMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
  })),
}));

vi.mock("@/lib/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");
  return {
    ...actual,
    getSessionStatus: getSessionStatusMock,
  };
});

type Handler = (payload: unknown) => void;
let handlers: Record<string, Handler>;
let disconnectMock: ReturnType<typeof vi.fn>;
let emitMock: ReturnType<typeof vi.fn>;
const connectRealtimeMock = vi.fn();

vi.mock("@/lib/realtime", () => ({
  connectRealtime: connectRealtimeMock,
}));

const { GET } = await import("./route.js");
const { ACCESS_COOKIE_NAME } = await import("@/lib/session");

function makeRequest(url: string): Request {
  return new Request(url);
}

async function readOneChunk(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const { value } = await reader.read();
  return new TextDecoder().decode(value);
}

describe("GET /api/caro/realtime", () => {
  beforeEach(() => {
    cookieStore.clear();
    handlers = {};
    disconnectMock = vi.fn();
    emitMock = vi.fn();
    connectRealtimeMock.mockReset();
    connectRealtimeMock.mockReturnValue({
      on: vi.fn((event: string, cb: Handler) => {
        handlers[event] = cb;
      }),
      emit: emitMock,
      disconnect: disconnectMock,
    });
    getSessionStatusMock.mockReset();
    getSessionStatusMock.mockResolvedValue({ isSignedIn: false });
  });

  it("responds with a text/event-stream content type", async () => {
    const response = await GET(makeRequest("https://web.test/api/caro/realtime"));

    expect(response.headers.get("content-type")).toBe("text/event-stream");
  });

  it("forwards a lobby:updated event as a correctly formatted SSE message", async () => {
    const response = await GET(makeRequest("https://web.test/api/caro/realtime"));

    const chunkPromise = readOneChunk(response.body as ReadableStream<Uint8Array>);
    handlers["lobby:updated"]({ matchId: "m1", action: "created" });

    expect(await chunkPromise).toBe(
      'event: lobby:updated\ndata: {"matchId":"m1","action":"created"}\n\n'
    );
  });

  it("forwards a quick_pair:matched event as a correctly formatted SSE message", async () => {
    const response = await GET(makeRequest("https://web.test/api/caro/realtime"));

    const chunkPromise = readOneChunk(response.body as ReadableStream<Uint8Array>);
    handlers["quick_pair:matched"]({ matchId: "m2" });

    expect(await chunkPromise).toBe('event: quick_pair:matched\ndata: {"matchId":"m2"}\n\n');
  });

  it("connects with the access token from the cookie when present", async () => {
    cookieStore.set(ACCESS_COOKIE_NAME, "token-abc");

    await GET(makeRequest("https://web.test/api/caro/realtime"));

    expect(connectRealtimeMock).toHaveBeenCalledWith("token-abc");
  });

  it("connects with null when there is no access token cookie (guest)", async () => {
    await GET(makeRequest("https://web.test/api/caro/realtime"));

    expect(connectRealtimeMock).toHaveBeenCalledWith(null);
  });

  it("does not join a room or subscribe to match events when matchId is absent", async () => {
    await GET(makeRequest("https://web.test/api/caro/realtime"));

    expect(emitMock).not.toHaveBeenCalled();
    expect(handlers["match:move_placed"]).toBeUndefined();
  });

  describe("spec 008: match-scoped room support", () => {
    it("emits join_room with the match room and no username for a guest request", async () => {
      await GET(makeRequest("https://web.test/api/caro/realtime?matchId=m1"));

      expect(emitMock).toHaveBeenCalledWith("join_room", {
        room: "match:m1",
        matchViewerUsername: undefined,
      });
    });

    it("emits join_room with the signed-in viewer's username", async () => {
      cookieStore.set(ACCESS_COOKIE_NAME, "token-abc");
      getSessionStatusMock.mockResolvedValue({
        isSignedIn: true,
        account: { id: "u1", email: "a@b.com", username: "alice", avatarUrl: "" },
      });

      await GET(makeRequest("https://web.test/api/caro/realtime?matchId=m1"));

      expect(emitMock).toHaveBeenCalledWith("join_room", {
        room: "match:m1",
        matchViewerUsername: "alice",
      });
    });

    it("forwards every match-scoped event as a correctly framed SSE message", async () => {
      const response = await GET(makeRequest("https://web.test/api/caro/realtime?matchId=m1"));

      const chunkPromise = readOneChunk(response.body as ReadableStream<Uint8Array>);
      handlers["match:viewer_joined"]({ matchId: "m1", viewerId: "u2", viewerUsername: "bob" });

      expect(await chunkPromise).toBe(
        'event: match:viewer_joined\ndata: {"matchId":"m1","viewerId":"u2","viewerUsername":"bob"}\n\n'
      );
      expect(handlers["match:player_joined"]).toBeDefined();
      expect(handlers["match:started"]).toBeDefined();
      expect(handlers["match:move_placed"]).toBeDefined();
      expect(handlers["match:turn_changed"]).toBeDefined();
      expect(handlers["match:draw_requested"]).toBeDefined();
      expect(handlers["match:draw_declined"]).toBeDefined();
      expect(handlers["match:ended"]).toBeDefined();
      expect(handlers["match:cancelled"]).toBeDefined();
      expect(handlers["match:chat"]).toBeDefined();
      expect(handlers["match:viewer_left"]).toBeDefined();
    });

    it("emits leave_room and disconnects on cancel", async () => {
      const response = await GET(makeRequest("https://web.test/api/caro/realtime?matchId=m1"));

      await (response.body as ReadableStream<Uint8Array>).cancel();

      expect(emitMock).toHaveBeenCalledWith("leave_room", { room: "match:m1" });
      expect(disconnectMock).toHaveBeenCalled();
    });
  });

  describe("spec 009: tournament-scoped room support", () => {
    it("emits join_room with the tournament room and no viewer payload", async () => {
      await GET(makeRequest("https://web.test/api/caro/realtime?tournamentId=t1"));

      expect(emitMock).toHaveBeenCalledWith("join_room", { room: "tournament:t1" });
    });

    it("forwards every tournament-scoped event plus the always-on match:started", async () => {
      const response = await GET(makeRequest("https://web.test/api/caro/realtime?tournamentId=t1"));

      const chunkPromise = readOneChunk(response.body as ReadableStream<Uint8Array>);
      handlers["tournament:match-created"]({ tournamentId: "t1", matchId: "m1" });

      expect(await chunkPromise).toBe(
        'event: tournament:match-created\ndata: {"tournamentId":"t1","matchId":"m1"}\n\n'
      );
      expect(handlers["tournament:status-changed"]).toBeDefined();
      expect(handlers["tournament:participant-updated"]).toBeDefined();
      expect(handlers["match:started"]).toBeDefined();
      expect(handlers["match:move_placed"]).toBeUndefined();
    });

    it("emits leave_room and disconnects on cancel", async () => {
      const response = await GET(makeRequest("https://web.test/api/caro/realtime?tournamentId=t1"));

      await (response.body as ReadableStream<Uint8Array>).cancel();

      expect(emitMock).toHaveBeenCalledWith("leave_room", { room: "tournament:t1" });
      expect(disconnectMock).toHaveBeenCalled();
    });
  });
});
