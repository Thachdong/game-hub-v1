import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getTournamentMock = vi.fn();
const listTournamentParticipantsMock = vi.fn();

vi.mock("@game-hub/caro-service", () => ({
  getTournament: getTournamentMock,
  listTournamentParticipants: listTournamentParticipantsMock,
}));

const getSessionStatusMock = vi.fn();

vi.mock("@/lib/session", () => ({
  ACCESS_COOKIE_NAME: "access_token",
  ensureCaroServiceConfigured: vi.fn(),
  getSessionStatus: getSessionStatusMock,
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));

vi.mock("@/lib/actions/caro", () => ({
  listTournamentParticipantsAction: vi.fn(),
}));
vi.mock("@/lib/useCaroRealtime", () => ({
  useCaroRealtimeEvent: vi.fn(),
}));

const { default: TournamentDetailPage } = await import("./page.js");

function makeTournament() {
  return {
    tournamentId: "t1",
    status: "waiting",
    startAt: "2026-07-07T10:00:00.000Z",
    endAt: "2026-07-07T11:00:00.000Z",
    minElo: 1000,
    gameConfig: { id: "cfg1", timeLimitSeconds: 30 },
    registrantCount: 5,
    createdAt: "2026-07-01T00:00:00.000Z",
  };
}

function makeStandings() {
  return {
    items: [
      {
        rank: 1,
        registrationId: "r1",
        playerId: "p1",
        tournamentPoints: 0,
        winStreak: 0,
        isPaused: false,
        status: "idle",
        eloAtRegistration: 1200,
        registeredAt: "2026-07-01T00:00:00.000Z",
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  };
}

describe("(public)/game-caro/tournament/[tournamentId]/page", () => {
  it("renders the tournament container for a successful fetch", async () => {
    getTournamentMock.mockResolvedValue({ ok: true, statusCode: 200, message: "ok", data: makeTournament() });
    listTournamentParticipantsMock.mockResolvedValue({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: makeStandings(),
    });
    getSessionStatusMock.mockResolvedValue({ isSignedIn: false });

    render(await TournamentDetailPage({ params: Promise.resolve({ tournamentId: "t1" }) }));

    expect(screen.getByTestId("standing-row-r1")).toBeInTheDocument();
  });

  it("renders a not-found message when getTournament fails", async () => {
    getTournamentMock.mockResolvedValue({ ok: false, reason: "NOT_FOUND", statusCode: 404, message: "not found" });
    listTournamentParticipantsMock.mockResolvedValue({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: makeStandings(),
    });
    getSessionStatusMock.mockResolvedValue({ isSignedIn: false });

    render(await TournamentDetailPage({ params: Promise.resolve({ tournamentId: "missing" }) }));

    expect(screen.getByText("Tournament not found.")).toBeInTheDocument();
  });
});
