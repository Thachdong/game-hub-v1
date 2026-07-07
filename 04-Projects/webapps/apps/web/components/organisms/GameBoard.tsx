"use client";

import { usePathname, useRouter } from "next/navigation";
import type { CaroMove } from "@game-hub/caro-service";
import { useAuthSession } from "@/components/templates/Providers";

function parseBoardSize(boardSize: string): { rows: number; cols: number } {
  const [width, height] = boardSize.split("x").map(Number);
  return { rows: height, cols: width };
}

/**
 * Renders the match's board, sized to `boardSize` (FR-001) and reflecting every move up to
 * `replayIndex ?? moves.length` (FR-002, data-model.md "MoveReplayView"). Always read-only
 * (`interactive` defaults to `false`) for guests, spectators, and replay mode.
 *
 * When `interactive` (state 3 only, US4), cell clicks are gated the same way as Start/Draw/
 * Surrender (FR-013/FR-014): a guest or signed-in non-participant redirects to login instead of
 * placing a move; a signed-in participant whose turn it isn't gets no effect (no redirect, an
 * already-fully-authorized viewer); the current-turn participant's click calls `onCellClick`.
 */
export function GameBoard({
  boardSize,
  moves,
  playerXId,
  playerOId,
  replayIndex,
  interactive = false,
  currentTurnPlayerId = null,
  onCellClick,
}: {
  boardSize: string;
  moves: CaroMove[];
  playerXId: string | null;
  playerOId: string | null;
  replayIndex?: number;
  interactive?: boolean;
  currentTurnPlayerId?: string | null;
  onCellClick?: (row: number, col: number) => void;
}) {
  const { isSignedIn, account } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();

  const { rows, cols } = parseBoardSize(boardSize);
  const visibleMoves = moves.slice(0, replayIndex ?? moves.length);

  const board: ("X" | "O" | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const move of visibleMoves) {
    if (move.row < 0 || move.row >= rows || move.col < 0 || move.col >= cols) continue;
    board[move.row][move.col] =
      move.playerId === playerXId ? "X" : move.playerId === playerOId ? "O" : null;
  }

  const isParticipant = account != null && (account.id === playerXId || account.id === playerOId);
  const isMyTurn = isParticipant && account?.id === currentTurnPlayerId;
  const shouldRedirectOnClick = interactive && (!isSignedIn || !isParticipant);
  const canPlaceMove = interactive && isSignedIn && isParticipant && isMyTurn;

  function handleCellClick(row: number, col: number) {
    if (shouldRedirectOnClick) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (canPlaceMove) {
      onCellClick?.(row, col);
    }
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
            onClick={interactive ? () => handleCellClick(row, col) : undefined}
            disabled={!interactive || cell !== null || (!shouldRedirectOnClick && !canPlaceMove)}
            className="flex h-6 w-6 items-center justify-center bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text-primary)] disabled:cursor-default"
          >
            {cell}
          </button>
        ))
      )}
    </div>
  );
}
