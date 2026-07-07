import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTournament, listTournamentParticipants, setTournamentPause } from "./tournaments.js";
import { configureCaroService, getClient } from "./http-client.js";

describe("tournaments", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureCaroService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("getTournament maps the TournamentDetailsDto shape", async () => {
    mock.onGet("/api/caro/tournaments/t1").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        tournamentId: "t1",
        status: "waiting",
        startAt: "2026-07-07T10:00:00.000Z",
        endAt: "2026-07-07T11:00:00.000Z",
        minElo: 1000,
        gameConfig: { id: "cfg1", timeLimitSeconds: 30 },
        registrantCount: 5,
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    });

    const result = await getTournament({ tournamentId: "t1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("waiting");
  });

  it("listTournamentParticipants passes page/pageSize and maps the pagination envelope", async () => {
    mock.onGet("/api/caro/tournaments/t1/participants").reply((config) => {
      expect(config.params).toEqual({ page: 2, pageSize: 20 });
      return [
        200,
        {
          statusCode: 200,
          message: "ok",
          data: {
            items: [
              {
                rank: 21,
                registrationId: "r1",
                playerId: "p1",
                tournamentPoints: 4,
                winStreak: 1,
                isPaused: false,
                status: "idle",
                eloAtRegistration: 1200,
                registeredAt: "2026-07-01T00:00:00.000Z",
              },
            ],
            page: 2,
            pageSize: 20,
            total: 37,
          },
        },
      ];
    });

    const result = await listTournamentParticipants({ tournamentId: "t1", page: 2, pageSize: 20 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.total).toBe(37);
      expect(result.data.items[0].rank).toBe(21);
    }
  });

  it("setTournamentPause patches the paused flag", async () => {
    mock.onPatch("/api/caro/tournaments/t1/registrations/pause", { paused: true }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: { registrationId: "r1", tournamentId: "t1", playerId: "p1", isPaused: true },
    });

    const result = await setTournamentPause({ tournamentId: "t1", paused: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.isPaused).toBe(true);
  });
});
