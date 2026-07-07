"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

/**
 * Server-authoritative countdown (constitution Principle VI) — always computed from `startAt`/
 * `endAt`, never a client-side duration. Before the tournament starts, counts down to `startAt`
 * (FR-001a); once `in_progress`, counts down to `endAt` (FR-001); once `ended`/`cancelled`, shows a
 * static final state with no ticking countdown.
 */
export function TournamentCountdown({
  status,
  startAt,
  endAt,
}: {
  status: string;
  startAt: string;
  endAt: string;
}) {
  const targetAt = status === "waiting" ? startAt : endAt;
  const label = status === "waiting" ? "Starts in" : "Ends in";
  const isFinal = status === "ended" || status === "cancelled";

  const [remainingMs, setRemainingMs] = useState(() => new Date(targetAt).getTime() - Date.now());

  useEffect(() => {
    if (isFinal) return;
    const tick = () => setRemainingMs(new Date(targetAt).getTime() - Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetAt, isFinal]);

  if (isFinal) {
    return (
      <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          Tournament {status === "cancelled" ? "cancelled" : "ended"}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <span className="text-sm font-medium text-[var(--color-text-primary)]">
        {label} {formatRemaining(remainingMs)}
      </span>
    </div>
  );
}
