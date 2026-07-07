"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";
import { formatGameType } from "@/lib/gameType";
import { requestQuickPairAction } from "@/lib/actions/caro";
import { useCaroRealtimeEvent } from "@/lib/useCaroRealtime";

export function QuickPairCard({
  configId,
  boardSize,
  moveTimeSeconds,
}: {
  configId: string;
  boardSize: string;
  moveTimeSeconds: number;
}) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);

  // Already emitted per-user by the backend today (data-model.md "Realtime event contract") — no
  // backend change needed for this path, only this SSE subscription.
  useCaroRealtimeEvent<{ matchId: string }>("quick_pair:matched", (payload) => {
    if (waiting) {
      router.push(`/game-caro/${payload.matchId}`);
    }
  });

  async function handleFindMatch() {
    const result = await requestQuickPairAction(configId);
    if (!result.ok) return;

    if (result.data.status === "matched" && result.data.matchId) {
      router.push(`/game-caro/${result.data.matchId}`);
    } else {
      setWaiting(true);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <span className="font-medium text-[var(--color-text-primary)]">
        {formatGameType(boardSize, moveTimeSeconds)}
      </span>
      <RequireSignIn onAction={handleFindMatch}>
        {({ onClick }) => (
          <Button onClick={onClick} disabled={waiting}>
            {waiting ? "Waiting for match…" : "Find Match"}
          </Button>
        )}
      </RequireSignIn>
    </div>
  );
}
