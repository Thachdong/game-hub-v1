import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
  })),
}));

type Handler = (payload: unknown) => void;
let handlers: Record<string, Handler>;
let disconnectMock: ReturnType<typeof vi.fn>;
const connectRealtimeMock = vi.fn();

vi.mock("@/lib/realtime", () => ({
  connectRealtime: connectRealtimeMock,
}));

const { GET } = await import("./route.js");
const { ACCESS_COOKIE_NAME } = await import("@/lib/session");

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
    connectRealtimeMock.mockReset();
    connectRealtimeMock.mockReturnValue({
      on: vi.fn((event: string, cb: Handler) => {
        handlers[event] = cb;
      }),
      disconnect: disconnectMock,
    });
  });

  it("responds with a text/event-stream content type", async () => {
    const response = await GET();

    expect(response.headers.get("content-type")).toBe("text/event-stream");
  });

  it("forwards a lobby:updated event as a correctly formatted SSE message", async () => {
    const response = await GET();

    const chunkPromise = readOneChunk(response.body as ReadableStream<Uint8Array>);
    handlers["lobby:updated"]({ matchId: "m1", action: "created" });

    expect(await chunkPromise).toBe(
      'event: lobby:updated\ndata: {"matchId":"m1","action":"created"}\n\n'
    );
  });

  it("forwards a quick_pair:matched event as a correctly formatted SSE message", async () => {
    const response = await GET();

    const chunkPromise = readOneChunk(response.body as ReadableStream<Uint8Array>);
    handlers["quick_pair:matched"]({ matchId: "m2" });

    expect(await chunkPromise).toBe('event: quick_pair:matched\ndata: {"matchId":"m2"}\n\n');
  });

  it("connects with the access token from the cookie when present", async () => {
    cookieStore.set(ACCESS_COOKIE_NAME, "token-abc");

    await GET();

    expect(connectRealtimeMock).toHaveBeenCalledWith("token-abc");
  });

  it("connects with null when there is no access token cookie (guest)", async () => {
    await GET();

    expect(connectRealtimeMock).toHaveBeenCalledWith(null);
  });
});
