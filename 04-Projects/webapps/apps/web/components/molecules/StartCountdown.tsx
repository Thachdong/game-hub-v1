"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";
import { useAuthSession } from "@/components/templates/Providers";

/**
 * Start control + 15s countdown (FR-004, FR-005). The countdown is always computed from
 * `deadlineAt` (constitution Principle VI), never the moment this component happened to render.
 *
 * Start's gating (FR-013/FR-014):
 * - guest or signed-in non-participant: control looks the same as a participant's, but clicking
 *   redirects to /login instead of starting the match.
 * - signed-in participant who isn't the creator: control is rendered visibly disabled — no click
 *   handler at all, no redirect (they're already fully authorized viewers, just not this action).
 * - the creator: clicking calls `onStart`.
 */
export function StartCountdown({
  deadlineAt,
  creatorId,
  playerXId,
  playerOId,
  onStart,
}: {
  deadlineAt: string;
  creatorId: string;
  playerXId: string | null;
  playerOId: string | null;
  onStart: () => void;
}) {
  const { account } = useAuthSession();
  const [remainingMs, setRemainingMs] = useState(() => new Date(deadlineAt).getTime() - Date.now());

  useEffect(() => {
    const tick = () => setRemainingMs(new Date(deadlineAt).getTime() - Date.now());
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [deadlineAt]);

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const isParticipant = account != null && (account.id === playerXId || account.id === playerOId);
  const isCreator = account?.id === creatorId;

  return (
    <div className="flex items-center justify-between gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <span className="text-sm text-[var(--color-text-secondary)]">Starts in {remainingSeconds}s</span>
      {isParticipant && !isCreator ? (
        <Button type="button" disabled>
          Start
        </Button>
      ) : (
        <RequireSignIn onAction={onStart} authorized={isParticipant}>
          {({ onClick }) => (
            <Button type="button" onClick={onClick}>
              Start
            </Button>
          )}
        </RequireSignIn>
      )}
    </div>
  );
}
