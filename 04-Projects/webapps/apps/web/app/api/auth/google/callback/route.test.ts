import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeFakeJwt(expSecondsFromNow: number): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + expSecondsFromNow };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
}

const setAuthCookiesMock = vi.fn();
const cookieStore = new Map<string, string>();

vi.mock("@/lib/session", () => ({
  setAuthCookies: setAuthCookiesMock,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
    delete: (name: string) => cookieStore.delete(name),
  })),
}));

const { GET } = await import("./route.js");

function makeRequest(url: string): Request {
  return new Request(url);
}

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = "https://api.test";
    cookieStore.clear();
    setAuthCookiesMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login?error=<value> when Google itself returns an error (no code)", async () => {
    const response = await GET(makeRequest("https://web.test/api/auth/google/callback?error=access_denied"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://web.test/login?error=access_denied");
    expect(setAuthCookiesMock).not.toHaveBeenCalled();
  });

  it("forwards code/state to the backend, sets auth cookies, and redirects to the cookie's destination on success", async () => {
    cookieStore.set("oauth_callback_url", "/account");
    const loginResult = {
      accessToken: makeFakeJwt(3600),
      refreshToken: "r",
      account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: loginResult }),
      })
    );

    const response = await GET(
      makeRequest("https://web.test/api/auth/google/callback?code=abc&state=xyz")
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining("code=abc") }),
      { method: "GET" }
    );
    expect(setAuthCookiesMock).toHaveBeenCalledWith(loginResult);
    expect(response.headers.get("location")).toBe("https://web.test/account");
    expect(cookieStore.has("oauth_callback_url")).toBe(false); // cleared
    // No token value ever appears in the redirect response itself (FR-002, SC-002).
    expect(JSON.stringify(Object.fromEntries(response.headers.entries()))).not.toContain(
      loginResult.accessToken
    );
  });

  it("redirects to /login?error=oauth_failed on backend failure, without setting cookies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const response = await GET(
      makeRequest("https://web.test/api/auth/google/callback?code=abc&state=xyz")
    );

    expect(setAuthCookiesMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://web.test/login?error=oauth_failed");
  });

  it("defaults to / when no oauth_callback_url cookie is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            accessToken: makeFakeJwt(3600),
            refreshToken: "r",
            account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
          },
        }),
      })
    );

    const response = await GET(
      makeRequest("https://web.test/api/auth/google/callback?code=abc&state=xyz")
    );

    expect(response.headers.get("location")).toBe("https://web.test/");
  });
});
