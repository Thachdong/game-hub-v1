import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import { refreshAccessToken } from "./token-refresh";

function makeFakeJwt(expSecondsFromNow: number): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + expSecondsFromNow };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
}

function baseToken(overrides: Partial<JWT> = {}): JWT {
  return {
    accessToken: makeFakeJwt(-60), // already expired
    refreshToken: "refresh-token-value",
    account: { id: "acc-1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
    accessTokenExpiresAt: Date.now() - 60_000,
    ...overrides,
  } as JWT;
}

describe("refreshAccessToken", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = "https://api.test";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renews an expired accessToken via the refresh endpoint and updates the token", async () => {
    const newAccessToken = makeFakeJwt(3600);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          statusCode: 200,
          message: "ok",
          data: { accessToken: newAccessToken },
        }),
      })
    );

    const result = await refreshAccessToken(baseToken());

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/api/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "refresh-token-value" }),
      })
    );
    expect(result.accessToken).toBe(newAccessToken);
    expect(result.error).toBeUndefined();
    expect(result.accessTokenExpiresAt).toBeGreaterThan(Date.now());
  });

  it("sets error: 'RefreshFailed' when the refresh call itself fails (non-ok response)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
    );

    const token = baseToken();
    const result = await refreshAccessToken(token);

    expect(result.error).toBe("RefreshFailed");
    expect(result.accessToken).toBe(token.accessToken); // unchanged, stale value preserved
  });

  it("sets error: 'RefreshFailed' when the refresh call throws (network error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error"))
    );

    const result = await refreshAccessToken(baseToken());

    expect(result.error).toBe("RefreshFailed");
  });
});
