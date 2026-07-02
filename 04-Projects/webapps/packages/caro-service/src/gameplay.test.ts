import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requestDraw, respondToDrawRequest, startMatch, submitMove, surrenderMatch } from "./gameplay.js";
import { configureCaroService, getClient } from "./http-client.js";

const matchState = {
  id: "m1",
  boardSize: "18x18",
  moveTimeSeconds: 15,
  visibility: "public" as const,
  status: "active",
  creatorId: "u1",
  playerX: null,
  playerO: null,
  currentTurnPlayerId: null,
  deadlineAt: null,
  moves: [],
  viewers: [],
  pendingDrawRequestFromId: null,
  result: null,
  winnerPlayerId: null,
  startedAt: null,
  endedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("gameplay", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureCaroService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("startMatch maps the MatchStateDto", async () => {
    mock.onPost("/api/caro/matches/m1/start").reply(200, { statusCode: 200, message: "ok", data: matchState });

    const result = await startMatch({ id: "m1" });
    expect(result.ok).toBe(true);
  });

  it("submitMove posts row/col and maps PlaceMoveResponseDto", async () => {
    mock.onPost("/api/caro/matches/m1/moves", { row: 2, col: 3 }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        playerId: "u1",
        row: 2,
        col: 3,
        sequenceNumber: 1,
        placedAt: "2026-01-01T00:00:00.000Z",
        isGameOver: false,
        result: null,
        winnerPlayerId: null,
      },
    });

    const result = await submitMove({ id: "m1", row: 2, col: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.isGameOver).toBe(false);
  });

  it("submitMove is NOT auto-retried on a transient failure (mutating call)", async () => {
    let attempts = 0;
    mock.onPost("/api/caro/matches/m1/moves").reply(() => {
      attempts += 1;
      return [503, { message: "temporarily unavailable" }];
    });

    const result = await submitMove({ id: "m1", row: 0, col: 0 });

    expect(attempts).toBe(1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("SERVER_ERROR");
  });

  it("surrenderMatch posts to the surrender endpoint", async () => {
    mock.onPost("/api/caro/matches/m1/surrender").reply(200, { statusCode: 200, message: "ok", data: matchState });

    const result = await surrenderMatch({ id: "m1" });
    expect(result.ok).toBe(true);
  });

  it("requestDraw posts to the draw-request endpoint", async () => {
    mock.onPost("/api/caro/matches/m1/draw-request").reply(200, { statusCode: 200, message: "ok", data: matchState });

    const result = await requestDraw({ id: "m1" });
    expect(result.ok).toBe(true);
  });

  it("respondToDrawRequest sends the accept/decline action", async () => {
    mock.onPut("/api/caro/matches/m1/draw-request/respond", { action: "decline" }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: matchState,
    });

    const result = await respondToDrawRequest({ id: "m1", action: "decline" });
    expect(result.ok).toBe(true);
  });
});
