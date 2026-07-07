import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerCard } from "./PlayerCard";

describe("PlayerCard", () => {
  it("falls back to a shortened id when username equals the raw id (research.md §3 row 1)", () => {
    render(
      <PlayerCard
        id="abcdef1234567890"
        username="abcdef1234567890"
        elo={0}
        winRate={0}
        isSelf={false}
        isCurrentTurn={false}
        isCreator={false}
      />
    );

    expect(screen.getByText("Player abcdef")).toBeInTheDocument();
  });

  it("renders the real username when it differs from the id", () => {
    render(
      <PlayerCard
        id="u1"
        username="alice"
        elo={0}
        winRate={0}
        isSelf={false}
        isCurrentTurn={false}
        isCreator={false}
      />
    );

    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("hides the Elo/win-rate badges when they read exactly 0", () => {
    render(
      <PlayerCard
        id="u1"
        username="alice"
        elo={0}
        winRate={0}
        isSelf={false}
        isCurrentTurn={false}
        isCreator={false}
      />
    );

    expect(screen.queryByText(/elo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/win rate/i)).not.toBeInTheDocument();
  });

  it("shows the Elo/win-rate badges when non-zero", () => {
    render(
      <PlayerCard
        id="u1"
        username="alice"
        elo={1500}
        winRate={0.5}
        isSelf={false}
        isCurrentTurn={false}
        isCreator={false}
      />
    );

    expect(screen.getByText("1500 Elo")).toBeInTheDocument();
    expect(screen.getByText("50% win rate")).toBeInTheDocument();
  });

  it("shows the current-turn indicator only when isCurrentTurn", () => {
    const { rerender } = render(
      <PlayerCard
        id="u1"
        username="alice"
        elo={0}
        winRate={0}
        isSelf={false}
        isCurrentTurn={true}
        isCreator={false}
      />
    );
    expect(screen.getByText("Current turn")).toBeInTheDocument();

    rerender(
      <PlayerCard
        id="u1"
        username="alice"
        elo={0}
        winRate={0}
        isSelf={false}
        isCurrentTurn={false}
        isCreator={false}
      />
    );
    expect(screen.queryByText("Current turn")).not.toBeInTheDocument();
  });

  it("shows the creator indicator and (You) suffix appropriately", () => {
    render(
      <PlayerCard
        id="u1"
        username="alice"
        elo={0}
        winRate={0}
        isSelf={true}
        isCurrentTurn={false}
        isCreator={true}
      />
    );

    expect(screen.getByText("Creator")).toBeInTheDocument();
    expect(screen.getByText("alice (You)")).toBeInTheDocument();
  });
});
