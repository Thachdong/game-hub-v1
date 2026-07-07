import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeFakeJwt(expSecondsFromNow: number): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + expSecondsFromNow };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
}

const cookieStore = new Map<string, string>();
const setCookieMock = vi.fn((name: string, value: string) => cookieStore.set(name, value));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
    set: setCookieMock,
  })),
}));

const { forwardToBackend } = await import("./proxy.js");
const { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } = await import("./session.js");

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    text: async () => JSON.stringify(body),
    headers: new Headers({ "content-type": "application/json" }),
  };
}

describe("forwardToBackend", () => {
  beforeEach(() => {
    cookieStore.clear();
    setCookieMock.mockClear();
    process.env.BACKEND_URL = "https://api.test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 401 with no backend call when there is no access_token cookie", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await forwardToBackend(
      makeRequest("https://web.test/api/proxy/widgets/123"),
      ["widgets", "123"]
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Not signed in" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards with the Bearer header (ignoring any inbound Authorization header) and relays the backend's response verbatim", async () => {
    cookieStore.set(ACCESS_COOKIE_NAME, makeFakeJwt(3600));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { statusCode: 200, message: "ok", data: { id: "1" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await forwardToBackend(
      makeRequest("https://web.test/api/proxy/widgets/123", {
        headers: { Authorization: "Bearer client-supplied" },
      }),
      ["widgets", "123"]
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("https://api.test/api/widgets/123");
    expect(options.method).toBe("GET");
    expect(options.headers.Authorization).toMatch(/^Bearer header\./);
    expect(options.headers.Authorization).not.toContain("client-supplied");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ statusCode: 200, message: "ok", data: { id: "1" } });
  });

  it("forwards the query string and request body for a mutating call", async () => {
    cookieStore.set(ACCESS_COOKIE_NAME, makeFakeJwt(3600));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { statusCode: 201, message: "created", data: { id: "2" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await forwardToBackend(
      makeRequest("https://web.test/api/proxy/widgets?foo=bar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "widget" }),
      }),
      ["widgets"]
    );

    const [calledUrl, options] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("https://api.test/api/widgets?foo=bar");
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ name: "widget" }));
    expect(response.status).toBe(201);
  });

  it("transparently refreshes and retries once on a 401, then relays the retried response", async () => {
    cookieStore.set(ACCESS_COOKIE_NAME, makeFakeJwt(-60));
    cookieStore.set(REFRESH_COOKIE_NAME, "refresh-value");
    const newAccessToken = makeFakeJwt(3600);

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "https://api.test/api/auth/refresh") {
        return Promise.resolve({ ok: true, json: async () => ({ data: { accessToken: newAccessToken } }) });
      }
      const headers = init?.headers as Record<string, string> | undefined;
      if (headers?.Authorization === `Bearer ${newAccessToken}`) {
        return Promise.resolve(jsonResponse(200, { statusCode: 200, message: "ok", data: { id: "1" } }));
      }
      return Promise.resolve({ status: 401, text: async () => "", headers: new Headers() });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await forwardToBackend(
      makeRequest("https://web.test/api/proxy/widgets/123"),
      ["widgets", "123"]
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ statusCode: 200, message: "ok", data: { id: "1" } });
  });

  it("returns a synthesized 401 (not the backend's raw body) when the refresh token is also invalid", async () => {
    cookieStore.set(ACCESS_COOKIE_NAME, makeFakeJwt(-60));
    cookieStore.set(REFRESH_COOKIE_NAME, "refresh-value");

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "https://api.test/api/auth/refresh") {
        return Promise.resolve({ ok: false, status: 401 });
      }
      return Promise.resolve({
        status: 401,
        text: async () => JSON.stringify({ message: "backend-shaped auth error" }),
        headers: new Headers({ "content-type": "application/json" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await forwardToBackend(
      makeRequest("https://web.test/api/proxy/widgets/123"),
      ["widgets", "123"]
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Not signed in" });
  });

  it("dedupes concurrent refresh calls when several proxied requests hit an expired token at once (FR-008)", async () => {
    cookieStore.set(ACCESS_COOKIE_NAME, makeFakeJwt(-60));
    cookieStore.set(REFRESH_COOKIE_NAME, "refresh-value");
    const newAccessToken = makeFakeJwt(3600);
    let refreshCalls = 0;

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "https://api.test/api/auth/refresh") {
        refreshCalls += 1;
        return Promise.resolve({ ok: true, json: async () => ({ data: { accessToken: newAccessToken } }) });
      }
      const headers = init?.headers as Record<string, string> | undefined;
      if (headers?.Authorization === `Bearer ${newAccessToken}`) {
        return Promise.resolve(jsonResponse(200, { statusCode: 200, message: "ok", data: {} }));
      }
      return Promise.resolve({ status: 401, text: async () => "", headers: new Headers() });
    });
    vi.stubGlobal("fetch", fetchMock);

    const responses = await Promise.all([
      forwardToBackend(makeRequest("https://web.test/api/proxy/widgets/123"), ["widgets", "123"]),
      forwardToBackend(makeRequest("https://web.test/api/proxy/widgets/123"), ["widgets", "123"]),
      forwardToBackend(makeRequest("https://web.test/api/proxy/widgets/123"), ["widgets", "123"]),
    ]);

    responses.forEach((r) => expect(r.status).toBe(200));
    expect(refreshCalls).toBe(1);
  });

  describe("006-caro-guest-access: optional-auth routes", () => {
    it("forwards GET caro/matches/lobby with no cookie and relays the backend's response (US1)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { statusCode: 200, message: "ok", data: [] }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/matches/lobby"),
        ["caro", "matches", "lobby"]
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, options] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe("https://api.test/api/caro/matches/lobby");
      expect(options.headers.Authorization).toBeUndefined();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ statusCode: 200, message: "ok", data: [] });
    });

    it("still attaches the Bearer header for caro/matches/lobby when a valid cookie is present (no regression)", async () => {
      cookieStore.set(ACCESS_COOKIE_NAME, makeFakeJwt(3600));
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { statusCode: 200, message: "ok", data: [] }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/matches/lobby"),
        ["caro", "matches", "lobby"]
      );

      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers.Authorization).toMatch(/^Bearer header\./);
      expect(response.status).toBe(200);
    });

    it("forwards GET caro/matches/{id} with no cookie and relays the backend's response (US2)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { statusCode: 200, message: "ok", data: { id: "m1" } }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/matches/m1"),
        ["caro", "matches", "m1"]
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, options] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe("https://api.test/api/caro/matches/m1");
      expect(options.headers.Authorization).toBeUndefined();
      expect(response.status).toBe(200);
    });

    it("still 401s DELETE caro/matches/{id} (creator-cancel) with no cookie — same path shape, different method", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/matches/m1", { method: "DELETE" }),
        ["caro", "matches", "m1"]
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ message: "Not signed in" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("forwards GET caro/matches/{id}/chat with no cookie and relays the backend's response (spec 008)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { statusCode: 200, message: "ok", data: [] }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/matches/m1/chat"),
        ["caro", "matches", "m1", "chat"]
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, options] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe("https://api.test/api/caro/matches/m1/chat");
      expect(options.headers.Authorization).toBeUndefined();
      expect(response.status).toBe(200);
    });

    it("still 401s POST caro/matches/{id}/chat (send) with no cookie — same path shape, different method", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/matches/m1/chat", { method: "POST" }),
        ["caro", "matches", "m1", "chat"]
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ message: "Not signed in" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("still 401s POST caro/matches/{id}/chat/mute with no cookie", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/matches/m1/chat/mute", { method: "POST" }),
        ["caro", "matches", "m1", "chat", "mute"]
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ message: "Not signed in" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("forwards POST caro/matches/{id}/moves with no cookie and relays the backend's response (US3)", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse(200, { statusCode: 200, message: "ok", data: { row: 0, col: 0 } })
        );
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/matches/m1/moves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ row: 0, col: 0 }),
        }),
        ["caro", "matches", "m1", "moves"]
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, options] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe("https://api.test/api/caro/matches/m1/moves");
      expect(options.headers.Authorization).toBeUndefined();
      expect(response.status).toBe(200);
    });

    it("still 401s POST caro/matches/{id}/join with no cookie — neighboring authed action", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/matches/m1/join", { method: "POST" }),
        ["caro", "matches", "m1", "join"]
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ message: "Not signed in" });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("007-caro-game-dashboard: tournament-read optional-auth routes", () => {
    it("forwards GET caro/tournaments with no cookie and relays the backend's response", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { statusCode: 200, message: "ok", data: [] }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/tournaments"),
        ["caro", "tournaments"]
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, options] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe("https://api.test/api/caro/tournaments");
      expect(options.headers.Authorization).toBeUndefined();
      expect(response.status).toBe(200);
    });

    it("forwards GET caro/tournaments/{id} with no cookie and relays the backend's response", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { statusCode: 200, message: "ok", data: { id: "t1" } }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/tournaments/t1"),
        ["caro", "tournaments", "t1"]
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, options] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe("https://api.test/api/caro/tournaments/t1");
      expect(options.headers.Authorization).toBeUndefined();
      expect(response.status).toBe(200);
    });

    it("forwards GET caro/tournaments/{id}/participants with no cookie and relays the backend's response", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { statusCode: 200, message: "ok", data: [] }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/tournaments/t1/participants"),
        ["caro", "tournaments", "t1", "participants"]
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, options] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe("https://api.test/api/caro/tournaments/t1/participants");
      expect(options.headers.Authorization).toBeUndefined();
      expect(response.status).toBe(200);
    });

    it("still 401s POST caro/tournaments/{id}/registrations with no cookie — requires an identity to register against", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/caro/tournaments/t1/registrations", { method: "POST" }),
        ["caro", "tournaments", "t1", "registrations"]
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ message: "Not signed in" });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("US1: the real /accounts/me resource end-to-end", () => {
    const account = { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" };

    it("relays the account identity verbatim when signed in", async () => {
      cookieStore.set(ACCESS_COOKIE_NAME, makeFakeJwt(3600));
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { statusCode: 200, message: "ok", data: account }));
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/accounts/me"),
        ["accounts", "me"]
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.test/api/accounts/me",
        expect.objectContaining({ method: "GET" })
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ statusCode: 200, message: "ok", data: account });
    });

    it("returns a clean 401 when signed out", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await forwardToBackend(
        makeRequest("https://web.test/api/proxy/accounts/me"),
        ["accounts", "me"]
      );

      expect(response.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
