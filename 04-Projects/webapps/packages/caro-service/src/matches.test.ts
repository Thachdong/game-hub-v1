import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createMatch,
  getMatch,
  inviteToMatch,
  joinMatch,
  leaveMatch,
  listLobbyMatches,
  respondToMatchInvitation,
} from "./matches.js";
import { configureCaroService, getClient } from "./http-client.js";

describe("matches", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureCaroService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("listLobbyMatches maps an array of LobbyMatchDto", async () => {
    mock.onGet("/api/caro/matches/lobby").reply(200, {
      statusCode: 200,
      message: "ok",
      data: [
        {
          id: "m1",
          boardSize: "18x18",
          moveTimeSeconds: 15,
          status: "lobby",
          creatorUsername: "alice",
          secondPlayerUsername: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = await listLobbyMatches();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("createMatch posts configId/visibility", async () => {
    mock.onPost("/api/caro/matches", { configId: "cfg1", visibility: "public" }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        id: "m1",
        configId: "cfg1",
        boardSize: "18x18",
        moveTimeSeconds: 15,
        visibility: "public",
        status: "lobby",
        creatorId: "u1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = await createMatch({ configId: "cfg1", visibility: "public" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe("m1");
  });

  it("joinMatch posts to the join endpoint", async () => {
    mock.onPost("/api/caro/matches/m1/join").reply(200, {
      statusCode: 200,
      message: "ok",
      data: { matchId: "m1", status: "waiting_for_start" },
    });

    const result = await joinMatch({ id: "m1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("waiting_for_start");
  });

  it("getMatch maps the full MatchStateDto", async () => {
    mock.onGet("/api/caro/matches/m1").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        id: "m1",
        boardSize: "18x18",
        moveTimeSeconds: 15,
        visibility: "public",
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
      },
    });

    const result = await getMatch({ id: "m1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("active");
  });

  it("leaveMatch posts to the real POST .../leave endpoint (not the contract's DELETE)", async () => {
    mock.onPost("/api/caro/matches/m1/leave").reply(200, {
      statusCode: 200,
      message: "ok",
      data: { id: "m1", status: "cancelled" },
    });

    const result = await leaveMatch({ id: "m1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("cancelled");
  });

  it("inviteToMatch posts the friendId", async () => {
    mock.onPost("/api/caro/matches/m1/invite", { friendId: "f1" }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: { matchId: "m1", invitedPlayerId: "f1" },
    });

    const result = await inviteToMatch({ id: "m1", friendId: "f1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.invitedPlayerId).toBe("f1");
  });

  it("respondToMatchInvitation sends the accept/decline action", async () => {
    mock.onPut("/api/caro/matches/m1/invitation/respond", { action: "accept" }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: { matchId: "m1", status: "waiting_for_start" },
    });

    const result = await respondToMatchInvitation({ id: "m1", action: "accept" });
    expect(result.ok).toBe(true);
  });
});
