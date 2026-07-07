"use client";

import { Button } from "@/components/atoms/Button";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";
import { formatGameType } from "@/lib/gameType";

export function QuickPairCard({
  configId,
  boardSize,
  moveTimeSeconds,
  onFindMatch,
}: {
  configId: string;
  boardSize: string;
  moveTimeSeconds: number;
  /** Placeholder until US5 wires the real quick-pair action. */
  onFindMatch?: (configId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <span className="font-medium text-[var(--color-text-primary)]">
        {formatGameType(boardSize, moveTimeSeconds)}
      </span>
      <RequireSignIn onAction={() => onFindMatch?.(configId)}>
        {({ onClick }) => <Button onClick={onClick}>Find Match</Button>}
      </RequireSignIn>
    </div>
  );
}
