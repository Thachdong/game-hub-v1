"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/atoms/Button";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";
import { registerForTournamentAction } from "@/lib/actions/caro";

export function TournamentCard({
  id,
  title,
  gameType,
  startAt,
  registeredCount,
}: {
  id: string;
  title: string;
  gameType: string;
  startAt: string;
  registeredCount: number;
}) {
  const [count, setCount] = useState(registeredCount);

  async function handleRegister() {
    const result = await registerForTournamentAction(id);
    if (result.ok) {
      setCount((current) => current + 1);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <span className="font-medium text-[var(--color-text-primary)]">{title}</span>
      <span className="text-sm text-[var(--color-text-secondary)]">{gameType}</span>
      <span className="text-sm text-[var(--color-text-secondary)]">
        Starts {new Date(startAt).toLocaleString()}
      </span>
      <span className="text-sm text-[var(--color-text-secondary)]">{count} registered</span>
      <div className="mt-2 flex gap-2">
        <Link
          href={`/game-caro/tournament/${id}`}
          className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]"
        >
          View
        </Link>
        <RequireSignIn onAction={handleRegister}>
          {({ onClick }) => <Button onClick={onClick}>Register</Button>}
        </RequireSignIn>
      </div>
    </div>
  );
}
