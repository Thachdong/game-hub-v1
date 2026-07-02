import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearSession, configureAuthService, exchangeGoogleCallback, getBackendClient, rotateAccessToken } from "./bff.js";

describe("bff", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureAuthService({ apiBaseUrl: "https://api.test" });
    mock = new MockAdapter(getBackendClient());
  });

  afterEach(() => {
    mock.restore();
  });

  it("exchangeGoogleCallback maps LoginResponseDto to accessToken/account/refreshTokenCookieValue", async () => {
    mock.onGet("/api/auth/google/callback").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        accessToken: "access-1",
        refreshToken: "refresh-1",
        account: { id: "acc-1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
      },
    });

    const result = await exchangeGoogleCallback({ code: "auth-code" });

    expect(result).toEqual({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: {
        accessToken: "access-1",
        refreshTokenCookieValue: "refresh-1",
        account: { id: "acc-1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
      },
    });
  });

  it("exchangeGoogleCallback forwards code and optional state as query params", async () => {
    mock.onGet("/api/auth/google/callback").reply((config) => {
      expect(config.params).toEqual({ code: "auth-code", state: "xyz" });
      return [
        200,
        {
          statusCode: 200,
          message: "ok",
          data: {
            accessToken: "access-1",
            refreshToken: "refresh-1",
            account: { id: "acc-1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
          },
        },
      ];
    });

    await exchangeGoogleCallback({ code: "auth-code", state: "xyz" });
  });

  it("rotateAccessToken maps RefreshResponseDto to accessToken", async () => {
    mock
      .onPost("/api/auth/refresh", { refreshToken: "refresh-1" })
      .reply(200, { statusCode: 200, message: "ok", data: { accessToken: "access-2" } });

    const result = await rotateAccessToken("refresh-1");

    expect(result).toEqual({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: { accessToken: "access-2" },
    });
  });

  it("clearSession resolves ok without a backend call", async () => {
    const result = await clearSession();
    expect(result).toEqual({ ok: true, data: undefined, statusCode: 200, message: "Session cleared" });
  });
});
