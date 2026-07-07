import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameDashboardTemplate } from "./GameDashboardTemplate";

describe("GameDashboardTemplate", () => {
  it("renders the leaderboard slot and defaults to the Lobby tab's content", () => {
    render(
      <GameDashboardTemplate
        lobby={<div>Lobby content</div>}
        tournament={<div>Tournament content</div>}
        quickPair={<div>Quick Pair content</div>}
        leaderboard={<div>Leaderboard content</div>}
      />
    );

    expect(screen.getByText("Lobby content")).toBeInTheDocument();
    expect(screen.queryByText("Tournament content")).not.toBeInTheDocument();
    expect(screen.queryByText("Quick Pair content")).not.toBeInTheDocument();
    expect(screen.getByText("Leaderboard content")).toBeInTheDocument();
  });

  it("switches tab content on click while the leaderboard slot stays rendered", () => {
    render(
      <GameDashboardTemplate
        lobby={<div>Lobby content</div>}
        tournament={<div>Tournament content</div>}
        quickPair={<div>Quick Pair content</div>}
        leaderboard={<div>Leaderboard content</div>}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Tournament" }));

    expect(screen.queryByText("Lobby content")).not.toBeInTheDocument();
    expect(screen.getByText("Tournament content")).toBeInTheDocument();
    expect(screen.getByText("Leaderboard content")).toBeInTheDocument();
  });
});
