"use client";

import { Button } from "@/components/atoms/Button";

/**
 * "Review Moves" control plus prev/next stepping (FR-008, FR-009). Available to every viewer,
 * including guests — no sign-in gate. Controlled: `replayIndex` (and driving `GameBoard`'s prop
 * of the same name, US5) lives in the caller, `null` meaning "not in replay mode yet."
 */
export function MoveReplayControls({
  totalMoves,
  replayIndex,
  onReplayIndexChange,
}: {
  totalMoves: number;
  replayIndex: number | null;
  onReplayIndexChange: (index: number | null) => void;
}) {
  if (replayIndex === null) {
    return (
      <Button type="button" onClick={() => onReplayIndexChange(totalMoves)}>
        Review Moves
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        onClick={() => onReplayIndexChange(Math.max(0, replayIndex - 1))}
        disabled={replayIndex <= 0}
      >
        Prev
      </Button>
      <span className="text-sm text-[var(--color-text-secondary)]">
        Move {replayIndex} / {totalMoves}
      </span>
      <Button
        type="button"
        onClick={() => onReplayIndexChange(Math.min(totalMoves, replayIndex + 1))}
        disabled={replayIndex >= totalMoves}
      >
        Next
      </Button>
    </div>
  );
}
