import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeFakeJwt(expSecondsFromNow: number): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + expSecondsFromNow };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
}

const account = { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" };

const cookieStore = new Map<string, string>();
const setCookieMock = vi.fn((name: string, value: string) => cookieStore.set(name, value));
const configureAccountServiceMock = vi.fn();
const getCurrentAccountMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
    set: setCookieMock,
  })),
}));

vi.mock("@game-hub/account-service", () => ({
  configureAccountService: configureAccountServiceMock,
  getCurrentAccount: getCurrentAccountMock,
}));

const { getSessionStatus, refreshSession, setAuthCookies, clearAuthCookies, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } =
  await import("./session.js");

describe("getSessionStatus", () => {
  beforeEach(() => {
    cookieStore.clear();
    configureAccountServiceMock.mockReset();
    getCurrentAccountMock.mockReset();
  });

  it("returns isSignedIn:false with no access_token cookie", async () => {
    // Simulates FR-009/SC-005: a stray/legacy cookie (e.g. a leftover NextAuth session cookie)
    // is present but access_token is not — must still resolve to signed-out.
    cookieStore.set("next-auth.session-token", "stale-value");

    const status = await getSessionStatus();

    expect(status).toEqual({ isSignedIn: false });
    expect(getCurrentAccountMock).not.toHaveBeenCalled();
  });

  it("returns isSignedIn:true with the account when the cookie is valid", async () => {
    cookieStore.set(ACCESS_COOKIE_NAME, makeFakeJwt(3600));
    getCurrentAccountMock.mockResolvedValue({ ok: true, data: account, statusCode: 200, message: "ok" });

    const status = await getSessionStatus();

    expect(status).toEqual({ isSignedIn: true, account });
    expect(configureAccountServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ getAccessToken: expect.any(Function), onUnauthenticated: refreshSession })
    );
  });

  it("returns isSignedIn:false when getCurrentAccount fails even after a refresh attempt", async () => {
    cookieStore.set(ACCESS_COOKIE_NAME, makeFakeJwt(-60));
    getCurrentAccountMock.mockResolvedValue({
      ok: false,
      reason: "UNAUTHENTICATED",
      statusCode: 401,
      message: "unauthorized",
    });

    const status = await getSessionStatus();

    expect(status).toEqual({ isSignedIn: false });
  });
});

describe("refreshSession", () => {
  beforeEach(() => {
    cookieStore.clear();
    setCookieMock.mockClear();
    process.env.BACKEND_URL = "https://api.test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null with no refresh_token cookie", async () => {
    await expect(refreshSession()).resolves.toBeNull();
  });

  it("renews via the backend and re-sets the access_token cookie on success", async () => {
    cookieStore.set(REFRESH_COOKIE_NAME, "refresh-value");
    const newAccessToken = makeFakeJwt(3600);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { accessToken: newAccessToken } }) })
    );

    const result = await refreshSession();

    expect(result).toBe(newAccessToken);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/api/auth/refresh",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ refreshToken: "refresh-value" }) })
    );
    expect(setCookieMock).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, newAccessToken, expect.any(Object));
  });

  it("returns null when the refresh token itself is no longer valid (FR-005)", async () => {
    cookieStore.set(REFRESH_COOKIE_NAME, "refresh-value");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    await expect(refreshSession()).resolves.toBeNull();
  });

  it("dedupes concurrent refresh calls for the same refresh token (FR-008)", async () => {
    cookieStore.set(REFRESH_COOKIE_NAME, "refresh-value");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { accessToken: makeFakeJwt(3600) } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("setAuthCookies / clearAuthCookies", () => {
  beforeEach(() => {
    cookieStore.clear();
    setCookieMock.mockClear();
  });

  it("sets both cookies from a login result", async () => {
    const accessToken = makeFakeJwt(3600);
    await setAuthCookies({ accessToken, refreshToken: "r", account });

    expect(setCookieMock).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, accessToken, expect.any(Object));
    expect(setCookieMock).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, "r", expect.any(Object));
  });

  it("clears both cookies", async () => {
    await clearAuthCookies();

    expect(setCookieMock).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, "", expect.objectContaining({ maxAge: 0 }));
    expect(setCookieMock).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, "", expect.objectContaining({ maxAge: 0 }));
  });
});
