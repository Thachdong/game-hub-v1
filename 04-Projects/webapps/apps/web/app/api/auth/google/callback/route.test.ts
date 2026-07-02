import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInMock = vi.fn();
const cookieStore = new Map<string, string>();

vi.mock("@/lib/auth", () => ({
  signIn: signInMock,
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
    signInMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login?error=<value> when Google itself returns an error (no code)", async () => {
    const response = await GET(makeRequest("https://web.test/api/auth/google/callback?error=access_denied"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://web.test/login?error=access_denied");
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("forwards code/state to the backend and redirects to the cookie's destination on success", async () => {
    cookieStore.set("oauth_callback_url", "/account");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            accessToken: "a",
            refreshToken: "r",
            account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
          },
        }),
      })
    );

    const response = await GET(
      makeRequest("https://web.test/api/auth/google/callback?code=abc&state=xyz")
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining("code=abc") }),
      { method: "GET" }
    );
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ accessToken: "a", refreshToken: "r", redirect: false })
    );
    expect(response.headers.get("location")).toBe("https://web.test/account");
    expect(cookieStore.has("oauth_callback_url")).toBe(false); // cleared
  });

  it("redirects to /login?error=oauth_failed on backend failure, without calling signIn", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const response = await GET(
      makeRequest("https://web.test/api/auth/google/callback?code=abc&state=xyz")
    );

    expect(signInMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://web.test/login?error=oauth_failed");
  });

  it("defaults to / when no oauth_callback_url cookie is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            accessToken: "a",
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
