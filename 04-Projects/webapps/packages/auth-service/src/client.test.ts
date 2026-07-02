import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAccessToken,
  handleSessionRefresh,
  proxyClient,
  refreshSession,
  setAccessToken,
} from "./client.js";

describe("token store", () => {
  afterEach(() => setAccessToken(null));

  it("starts unauthenticated and reflects set/clear", () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken("token-1");
    expect(getAccessToken()).toBe("token-1");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});

describe("refreshSession", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(proxyClient);
  });

  afterEach(() => {
    mock.restore();
    setAccessToken(null);
  });

  it("stores the renewed access token on success", async () => {
    mock
      .onPost("/api/auth/refresh")
      .reply(200, { statusCode: 200, message: "ok", data: { accessToken: "renewed-token" } });

    const result = await refreshSession();

    expect(result).toEqual({
      ok: true,
      data: { accessToken: "renewed-token" },
      statusCode: 200,
      message: "ok",
    });
    expect(getAccessToken()).toBe("renewed-token");
  });

  it("reports UNAUTHENTICATED when the refresh itself fails", async () => {
    mock.onPost("/api/auth/refresh").reply(401, { message: "invalid refresh token" });

    const result = await refreshSession();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("UNAUTHENTICATED");
    }
    expect(getAccessToken()).toBeNull();
  });

  it("handleSessionRefresh returns null when refresh fails (usable as another package's onUnauthenticated)", async () => {
    mock.onPost("/api/auth/refresh").reply(401, { message: "invalid refresh token" });

    await expect(handleSessionRefresh()).resolves.toBeNull();
  });

  it("handleSessionRefresh returns the new token when refresh succeeds", async () => {
    mock
      .onPost("/api/auth/refresh")
      .reply(200, { statusCode: 200, message: "ok", data: { accessToken: "renewed-token" } });

    await expect(handleSessionRefresh()).resolves.toBe("renewed-token");
  });
});
