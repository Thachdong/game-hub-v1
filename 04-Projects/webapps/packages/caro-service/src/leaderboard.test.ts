import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLeaderboard } from "./leaderboard.js";
import { configureCaroService, getClient } from "./http-client.js";

describe("leaderboard", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureCaroService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("getLeaderboard unwraps the `entries` envelope into a plain array", async () => {
    mock.onGet("/api/caro/leaderboard").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        entries: [
          { rank: 1, playerId: "p1", elo: 1500, matchesPlayed: 10, wins: 7, losses: 2, draws: 1, winRate: 0.7 },
        ],
      },
    });

    const result = await getLeaderboard();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });
});
