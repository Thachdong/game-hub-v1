"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";
import { formatGameType } from "@/lib/gameType";
import { joinMatchAction } from "@/lib/actions/caro";

export function LobbyMatchCard({
  id,
  creatorUsername,
  creatorElo,
  boardSize,
  moveTimeSeconds,
}: {
  id: string;
  creatorUsername: string;
  creatorElo: number | null;
  boardSize: string;
  moveTimeSeconds: number;
}) {
  const router = useRouter();

  async function handleJoin() {
    const result = await joinMatchAction(id);
    if (result.ok) {
      router.push(`/game-caro/${id}`);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-[var(--color-text-primary)]">{creatorUsername}</span>
        {creatorElo !== null ? (
          <span className="text-sm text-[var(--color-text-secondary)]">{creatorElo} Elo</span>
        ) : null}
      </div>
      <span className="text-sm text-[var(--color-text-secondary)]">
        {formatGameType(boardSize, moveTimeSeconds)}
      </span>
      <div className="mt-2 flex gap-2">
        <Link
          href={`/game-caro/${id}`}
          className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]"
        >
          View
        </Link>
        <RequireSignIn onAction={handleJoin}>
          {({ onClick }) => <Button onClick={onClick}>Join</Button>}
        </RequireSignIn>
      </div>
    </div>
  );
}
