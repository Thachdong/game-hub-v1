import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StandingsPage, TournamentDetails } from "@game-hub/caro-service";

const listTournamentParticipantsActionMock = vi.fn();

vi.mock("@/lib/actions/caro", () => ({
  listTournamentParticipantsAction: listTournamentParticipantsActionMock,
}));

type Handler = (payload: unknown) => void;
const handlers: Record<string, Handler> = {};
const useCaroRealtimeEventMock = vi.fn(
  (eventName: string, handler: Handler, _matchId?: string, _tournamentId?: string) => {
    handlers[eventName] = handler;
  }
);

vi.mock("@/lib/useCaroRealtime", () => ({
  useCaroRealtimeEvent: (
    eventName: string,
    handler: Handler,
    matchId?: string,
    tournamentId?: string
  ) => useCaroRealtimeEventMock(eventName, handler, matchId, tournamentId),
}));

const { TournamentContainer } = await import("./TournamentContainer.js");

function makeTournament(overrides: Partial<TournamentDetails> = {}): TournamentDetails {
  return {
    tournamentId: "t1",
    status: "in_progress",
    startAt: "2026-07-07T10:00:00.000Z",
    endAt: "2026-07-07T11:00:00.000Z",
    minElo: 1000,
    gameConfig: { id: "cfg1", timeLimitSeconds: 30 },
    registrantCount: 2,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeStandings(overrides: Partial<StandingsPage> = {}): StandingsPage {
  return {
    items: [
      {
        rank: 1,
        registrationId: "r1",
        playerId: "p1",
        tournamentPoints: 8,
        winStreak: 2,
        isPaused: false,
        status: "idle",
        eloAtRegistration: 1200,
        registeredAt: "2026-07-01T00:00:00.000Z",
      },
      {
        rank: 2,
        registrationId: "r2",
        playerId: "p2",
        tournamentPoints: 4,
        winStreak: 0,
        isPaused: false,
        status: "idle",
        eloAtRegistration: 1150,
        registeredAt: "2026-07-01T01:00:00.000Z",
      },
    ],
    page: 1,
    pageSize: 20,
    total: 2,
    ...overrides,
  };
}

describe("TournamentContainer", () => {
  beforeEach(() => {
    listTournamentParticipantsActionMock.mockReset();
    for (const key of Object.keys(handlers)) delete handlers[key];
  });

  it("renders the countdown and standings from initial props", () => {
    render(
      <TournamentContainer
        initialTournament={makeTournament()}
        initialStandings={makeStandings()}
        currentPlayerId={null}
      />
    );

    expect(screen.getByTestId("standing-row-r1")).toBeInTheDocument();
    expect(screen.getByTestId("standing-row-r2")).toBeInTheDocument();
  });

  it("subscribes to tournament realtime events scoped by tournamentId", () => {
    render(
      <TournamentContainer
        initialTournament={makeTournament()}
        initialStandings={makeStandings()}
        currentPlayerId={null}
      />
    );

    expect(useCaroRealtimeEventMock).toHaveBeenCalledWith(
      "tournament:status-changed",
      expect.any(Function),
      undefined,
      "t1"
    );
    expect(useCaroRealtimeEventMock).toHaveBeenCalledWith(
      "tournament:participant-updated",
      expect.any(Function),
      undefined,
      "t1"
    );
  });

  it("updates a standing's score/streak in place on tournament:participant-updated", () => {
    render(
      <TournamentContainer
        initialTournament={makeTournament()}
        initialStandings={makeStandings()}
        currentPlayerId={null}
      />
    );

    act(() => {
      handlers["tournament:participant-updated"]({
        tournamentId: "t1",
        playerId: "p2",
        tournamentPoints: 6,
        winStreak: 1,
      });
    });

    expect(screen.getByText("6 pts")).toBeInTheDocument();
    expect(screen.getByText("Streak 1")).toBeInTheDocument();
  });

  it("reflects a tournament:status-changed event in the countdown label", () => {
    render(
      <TournamentContainer
        initialTournament={makeTournament({ status: "waiting" })}
        initialStandings={makeStandings()}
        currentPlayerId={null}
      />
    );

    act(() => {
      handlers["tournament:status-changed"]({ tournamentId: "t1", status: "in_progress" });
    });

    expect(screen.getByText(/Ends in/)).toBeInTheDocument();
  });

  it("fetches the next page via the server action on page change", async () => {
    listTournamentParticipantsActionMock.mockResolvedValue({
      ok: true,
      data: makeStandings({ page: 2, items: [] }),
      statusCode: 200,
      message: "ok",
    });

    render(
      <TournamentContainer
        initialTournament={makeTournament()}
        initialStandings={makeStandings({ total: 37 })}
        currentPlayerId={null}
      />
    );

    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });

    expect(listTournamentParticipantsActionMock).toHaveBeenCalledWith({
      tournamentId: "t1",
      page: 2,
      pageSize: 20,
    });
  });
});
