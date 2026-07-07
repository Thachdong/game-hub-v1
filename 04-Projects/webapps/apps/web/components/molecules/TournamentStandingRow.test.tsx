import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TournamentStandingRow } from "./TournamentStandingRow";
import type { TournamentStanding } from "@game-hub/caro-service";

const standing: TournamentStanding = {
  rank: 1,
  registrationId: "r1",
  playerId: "player-abc123",
  tournamentPoints: 8,
  winStreak: 3,
  isPaused: false,
  status: "idle",
  eloAtRegistration: 1200,
  registeredAt: "2026-07-01T00:00:00.000Z",
};

describe("TournamentStandingRow", () => {
  it("renders rank, score, and streak", () => {
    render(<TournamentStandingRow standing={standing} isSelf={false} />);

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("8 pts")).toBeInTheDocument();
    expect(screen.getByText("Streak 3")).toBeInTheDocument();
  });

  it("shows a Paused badge when the participant has paused (FR-004)", () => {
    render(<TournamentStandingRow standing={{ ...standing, isPaused: true }} isSelf={false} />);

    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("does not show a Paused badge when eligible", () => {
    render(<TournamentStandingRow standing={standing} isSelf={false} />);

    expect(screen.queryByText("Paused")).not.toBeInTheDocument();
  });
});
