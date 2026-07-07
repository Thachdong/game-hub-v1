import type { BoardSize, MoveTimeSeconds } from "@game-hub/caro-service";

/** Shared "Game Type" label used identically on Lobby, Tournament, and Quick Pair cards (data-model.md). */
export function formatGameType(boardSize: BoardSize | string, moveTimeSeconds: MoveTimeSeconds | number): string {
  const [width, height] = boardSize.split("x");
  return `${width}×${height} · ${moveTimeSeconds}s/move`;
}
