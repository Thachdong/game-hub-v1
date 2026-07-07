import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LeaderboardPanel } from "./LeaderboardPanel";

function entry(rank: number, playerId: string, elo: number) {
  return { rank, playerId, elo, matchesPlayed: 10, wins: 5, losses: 5, draws: 0, winRate: 0.5 };
}

describe("LeaderboardPanel", () => {
  it("renders up to 10 entries with the top-3 highlighted and the viewer's own row badged", () => {
    const entries = Array.from({ length: 12 }, (_, i) => entry(i + 1, `player-${i}`, 2000 - i * 10));

    render(<LeaderboardPanel entries={entries} currentAccountId="player-5" />);

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getAllByText(/^Player /)).toHaveLength(10);
  });

  it("renders exactly the given entries when there are fewer than 10 (Edge Cases)", () => {
    const entries = [entry(1, "p1", 1900), entry(2, "p2", 1800), entry(3, "p3", 1700)];

    render(<LeaderboardPanel entries={entries} currentAccountId={null} />);

    expect(screen.getAllByText(/^Player /)).toHaveLength(3);
  });

  it("shows a guest-safe empty state instead of an error when entries is null (401)", () => {
    render(<LeaderboardPanel entries={null} currentAccountId={null} />);

    expect(screen.getByText(/only available to signed-in players/i)).toBeInTheDocument();
  });
});
