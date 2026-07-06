import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMyMatchHistory, getMyPlayerProfile, getPlayerMatchHistory, getPlayerProfile } from "./players.js";
import { configureCaroService, getClient } from "./http-client.js";

describe("players", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureCaroService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("getMyPlayerProfile maps PlayerProfileResponseDto", async () => {
    mock.onGet("/api/caro/players/me").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        playerId: "p1",
        elo: 1500,
        matchesPlayed: 10,
        wins: 7,
        losses: 2,
        draws: 1,
        winRate: 0.7,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = await getMyPlayerProfile();
    expect(result.ok).toBe(true);
  });

  it("getPlayerProfile maps by playerId", async () => {
    mock.onGet("/api/caro/players/p2").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        playerId: "p2",
        elo: 1400,
        matchesPlayed: 5,
        wins: 2,
        losses: 3,
        draws: 0,
        winRate: 0.4,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = await getPlayerProfile({ playerId: "p2" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.playerId).toBe("p2");
  });

  it("getMyMatchHistory returns a CursorPage and encodes the cursor as a single query param", async () => {
    mock.onGet("/api/caro/players/me/history").reply((config) => {
      expect(config.params).toEqual({ cursor: "2026-01-01T00:00:00.000Z_h1" });
      return [
        200,
        {
          statusCode: 200,
          message: "ok",
          data: { items: [], nextCursor: null },
        },
      ];
    });

    const result = await getMyMatchHistory({ cursor: { createdAt: "2026-01-01T00:00:00.000Z", id: "h1" } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.nextCursor).toBeNull();
  });

  it("getPlayerMatchHistory returns a CursorPage for the given player", async () => {
    mock.onGet("/api/caro/players/p2/history").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        items: [
          {
            id: "match1",
            boardSize: "18x18",
            moveTimeSeconds: 15,
            result: "win",
            winnerPlayerId: "p2",
            playerXEloChange: 12,
            playerOEloChange: -12,
            startedAt: "2026-01-01T00:00:00.000Z",
            endedAt: "2026-01-01T00:10:00.000Z",
          },
        ],
        nextCursor: null,
      },
    });

    const result = await getPlayerMatchHistory({ playerId: "p2" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.items).toHaveLength(1);
  });
});
