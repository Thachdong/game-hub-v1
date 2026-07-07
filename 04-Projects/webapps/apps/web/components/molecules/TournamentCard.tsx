"use client";

import Link from "next/link";
import { Button } from "@/components/atoms/Button";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";

export function TournamentCard({
  id,
  title,
  gameType,
  startAt,
  registeredCount,
  onRegister,
}: {
  id: string;
  title: string;
  gameType: string;
  startAt: string;
  registeredCount: number;
  /** Placeholder until US4 wires the real register action. */
  onRegister?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <span className="font-medium text-[var(--color-text-primary)]">{title}</span>
      <span className="text-sm text-[var(--color-text-secondary)]">{gameType}</span>
      <span className="text-sm text-[var(--color-text-secondary)]">
        Starts {new Date(startAt).toLocaleString()}
      </span>
      <span className="text-sm text-[var(--color-text-secondary)]">{registeredCount} registered</span>
      <div className="mt-2 flex gap-2">
        <Link
          href={`/game-caro/tournament/${id}`}
          className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]"
        >
          View
        </Link>
        <RequireSignIn onAction={() => onRegister?.(id)}>
          {({ onClick }) => <Button onClick={onClick}>Register</Button>}
        </RequireSignIn>
      </div>
    </div>
  );
}
