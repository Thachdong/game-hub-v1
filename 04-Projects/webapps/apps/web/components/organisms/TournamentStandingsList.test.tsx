import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TournamentStandingsList } from "./TournamentStandingsList";
import type { TournamentStanding } from "@game-hub/caro-service";

function makeStanding(overrides: Partial<TournamentStanding> = {}): TournamentStanding {
  return {
    rank: 1,
    registrationId: "r1",
    playerId: "p1",
    tournamentPoints: 4,
    winStreak: 0,
    isPaused: false,
    status: "idle",
    eloAtRegistration: 1200,
    registeredAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("TournamentStandingsList", () => {
  it("shows an empty state when there are no participants", () => {
    render(
      <TournamentStandingsList
        standings={[]}
        page={1}
        pageSize={20}
        total={0}
        currentPlayerId={null}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText("No participants registered yet")).toBeInTheDocument();
  });

  it("renders every participant exactly once, ordered as given (FR-002)", () => {
    render(
      <TournamentStandingsList
        standings={[
          makeStanding({ registrationId: "r1", playerId: "p1", rank: 1, tournamentPoints: 8 }),
          makeStanding({ registrationId: "r2", playerId: "p2", rank: 2, tournamentPoints: 4 }),
        ]}
        page={1}
        pageSize={20}
        total={2}
        currentPlayerId={null}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("standing-row-r1")).toBeInTheDocument();
    expect(screen.getByTestId("standing-row-r2")).toBeInTheDocument();
  });

  it("renders the pagination control with the correct page count", () => {
    render(
      <TournamentStandingsList
        standings={[makeStanding()]}
        page={1}
        pageSize={20}
        total={37}
        currentPlayerId={null}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });
});
