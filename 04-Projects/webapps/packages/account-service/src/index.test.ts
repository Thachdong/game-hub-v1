import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configureAccountService, getCurrentAccount, listGames } from "./index.js";
import { getClient } from "./http-client.js";

describe("account-service", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureAccountService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => {
    mock.restore();
  });

  it("getCurrentAccount maps AccountInResponseDto", async () => {
    mock.onGet("/api/accounts/me").reply(200, {
      statusCode: 200,
      message: "ok",
      data: { id: "acc-1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
    });

    const result = await getCurrentAccount();

    expect(result).toEqual({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: { id: "acc-1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
    });
  });

  it("listGames maps an array of GameEntryDto", async () => {
    mock.onGet("/api/games").reply(200, {
      statusCode: 200,
      message: "ok",
      data: [{ id: "g1", name: "Caro", slug: "caro", bannerUrl: "https://cdn.test/caro.png", hasProfile: true }],
    });

    const result = await listGames();

    expect(result).toEqual({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: [{ id: "g1", name: "Caro", slug: "caro", bannerUrl: "https://cdn.test/caro.png", hasProfile: true }],
    });
  });
});
