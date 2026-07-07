import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MatchState } from "@game-hub/caro-service";
import { GameboardSidePanel } from "./GameboardSidePanel";

function makeMatch(status: string): MatchState {
  return {
    id: "m1",
    boardSize: "18x18",
    moveTimeSeconds: 15,
    visibility: "public",
    status,
    creatorId: "c1",
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
    createdAt: "t",
  };
}

describe("GameboardSidePanel", () => {
  it("renders state 1 for looking_for_opponent", () => {
    render(<GameboardSidePanel match={makeMatch("looking_for_opponent")} />);
    expect(screen.getByTestId("gameboard-state-1")).toBeInTheDocument();
  });

  it("renders state 2 for waiting_for_start", () => {
    render(<GameboardSidePanel match={makeMatch("waiting_for_start")} />);
    expect(screen.getByTestId("gameboard-state-2")).toBeInTheDocument();
  });

  it("renders state 3 for in_progress", () => {
    render(<GameboardSidePanel match={makeMatch("in_progress")} />);
    expect(screen.getByTestId("gameboard-state-3")).toBeInTheDocument();
  });

  it("renders state 4 for completed", () => {
    render(<GameboardSidePanel match={makeMatch("completed")} />);
    expect(screen.getByTestId("gameboard-state-4")).toBeInTheDocument();
  });

  it("renders state 4 for cancelled", () => {
    render(<GameboardSidePanel match={makeMatch("cancelled")} />);
    expect(screen.getByTestId("gameboard-state-4")).toBeInTheDocument();
  });
});
