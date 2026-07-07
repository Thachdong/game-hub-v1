import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameBoard } from "./GameBoard";

describe("GameBoard", () => {
  it("renders a grid sized to boardSize (rows x cols) for each BoardSize", () => {
    const { unmount } = render(
      <GameBoard boardSize="18x18" moves={[]} playerXId={null} playerOId={null} />
    );
    expect(screen.getAllByRole("gridcell")).toHaveLength(18 * 18);
    unmount();

    render(<GameBoard boardSize="3x3" moves={[]} playerXId={null} playerOId={null} />);
    expect(screen.getAllByRole("gridcell")).toHaveLength(9);
  });

  it("renders each recorded move as X or O for the corresponding player", () => {
    render(
      <GameBoard
        boardSize="3x3"
        moves={[
          { playerId: "x1", row: 0, col: 0, sequenceNumber: 1, placedAt: "t" },
          { playerId: "o1", row: 1, col: 1, sequenceNumber: 2, placedAt: "t" },
        ]}
        playerXId="x1"
        playerOId="o1"
      />
    );

    expect(screen.getByLabelText("Row 1, Column 1, X")).toBeInTheDocument();
    expect(screen.getByLabelText("Row 2, Column 2, O")).toBeInTheDocument();
  });

  it("truncates the rendered board to replayIndex", () => {
    render(
      <GameBoard
        boardSize="3x3"
        moves={[
          { playerId: "x1", row: 0, col: 0, sequenceNumber: 1, placedAt: "t" },
          { playerId: "o1", row: 1, col: 1, sequenceNumber: 2, placedAt: "t" },
        ]}
        playerXId="x1"
        playerOId="o1"
        replayIndex={1}
      />
    );

    expect(screen.getByLabelText("Row 1, Column 1, X")).toBeInTheDocument();
    expect(screen.getByLabelText("Row 2, Column 2")).toBeInTheDocument();
  });

  it("calls onCellClick with row/col when an empty cell is clicked", () => {
    const onCellClick = vi.fn();
    render(
      <GameBoard
        boardSize="2x2"
        moves={[]}
        playerXId={null}
        playerOId={null}
        onCellClick={onCellClick}
      />
    );

    screen.getByLabelText("Row 1, Column 1").click();

    expect(onCellClick).toHaveBeenCalledWith(0, 0);
  });

  it("disables every cell when onCellClick is omitted (guest/spectator/replay board is inert)", () => {
    render(<GameBoard boardSize="2x2" moves={[]} playerXId={null} playerOId={null} />);

    const cell = screen.getByLabelText("Row 1, Column 1") as HTMLButtonElement;
    expect(cell.disabled).toBe(true);
  });

  it("disables an already-occupied cell even when onCellClick is provided", () => {
    const onCellClick = vi.fn();
    render(
      <GameBoard
        boardSize="2x2"
        moves={[{ playerId: "x1", row: 0, col: 0, sequenceNumber: 1, placedAt: "t" }]}
        playerXId="x1"
        playerOId="o1"
        onCellClick={onCellClick}
      />
    );

    const cell = screen.getByLabelText("Row 1, Column 1, X") as HTMLButtonElement;
    expect(cell.disabled).toBe(true);
  });
});
