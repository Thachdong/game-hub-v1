"use client";

import type { CaroMove } from "@game-hub/caro-service";

function parseBoardSize(boardSize: string): { rows: number; cols: number } {
  const [width, height] = boardSize.split("x").map(Number);
  return { rows: height, cols: width };
}

/**
 * Renders the match's board, sized to `boardSize` (FR-001) and reflecting every move up to
 * `replayIndex ?? moves.length` (FR-002, data-model.md "MoveReplayView"). Read-only (no
 * `onCellClick`) for guests, spectators, and replay mode; interactive only when the caller
 * supplies `onCellClick` (US4 wires this for the current-turn participant only).
 */
export function GameBoard({
  boardSize,
  moves,
  playerXId,
  playerOId,
  replayIndex,
  onCellClick,
}: {
  boardSize: string;
  moves: CaroMove[];
  playerXId: string | null;
  playerOId: string | null;
  replayIndex?: number;
  onCellClick?: (row: number, col: number) => void;
}) {
  const { rows, cols } = parseBoardSize(boardSize);
  const visibleMoves = moves.slice(0, replayIndex ?? moves.length);

  const board: ("X" | "O" | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const move of visibleMoves) {
    if (move.row < 0 || move.row >= rows || move.col < 0 || move.col >= cols) continue;
    board[move.row][move.col] =
      move.playerId === playerXId ? "X" : move.playerId === playerOId ? "O" : null;
  }

  return (
    <div
      role="grid"
      aria-label="Caro board"
      className="inline-grid gap-px bg-[var(--color-border)] p-px"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {board.map((rowCells, row) =>
        rowCells.map((cell, col) => (
          <button
            key={`${row}-${col}`}
            type="button"
            role="gridcell"
            aria-label={`Row ${row + 1}, Column ${col + 1}${cell ? `, ${cell}` : ""}`}
            onClick={onCellClick ? () => onCellClick(row, col) : undefined}
            disabled={!onCellClick || cell !== null}
            className="flex h-6 w-6 items-center justify-center bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-primary)] disabled:cursor-default"
          >
            {cell}
          </button>
        ))
      )}
    </div>
  );
}
