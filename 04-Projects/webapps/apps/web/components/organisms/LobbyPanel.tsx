"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/molecules/EmptyState";
import { LobbyMatchCard } from "@/components/molecules/LobbyMatchCard";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";
import { CreateGameModal, type CreatedMatch } from "@/components/organisms/CreateGameModal";
import { useAuthSession } from "@/components/templates/Providers";
import { useCaroRealtimeEvent } from "@/lib/useCaroRealtime";
import type { GameConfig, LobbyMatch } from "@game-hub/caro-service";

interface LobbyUpdatedPayload {
  matchId: string;
  action: "created" | "joined" | "filled" | "cancelled";
}

/**
 * Seeded from the page's server-fetched initial data (listLobbyMatches() is server-only —
 * research.md §1) and kept live via the SSE bridge. `lobby:updated` currently only carries
 * `{ matchId, action }` (research.md §2 row 5), so a "created" event can't yet be turned into a
 * full card — only removals (joined/filled/cancelled) are actionable today.
 */
export function LobbyPanel({
  initialMatches,
  gameConfigs,
}: {
  initialMatches: LobbyMatch[];
  gameConfigs: GameConfig[];
}) {
  const [matches, setMatches] = useState(initialMatches);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const { account } = useAuthSession();

  useCaroRealtimeEvent<LobbyUpdatedPayload>("lobby:updated", (payload) => {
    if (payload.action === "joined" || payload.action === "filled" || payload.action === "cancelled") {
      setMatches((current) => current.filter((match) => match.id !== payload.matchId));
    }
  });

  function handleCreated(created: CreatedMatch) {
    setMatches((current) => [
      {
        id: created.id,
        boardSize: created.boardSize,
        moveTimeSeconds: created.moveTimeSeconds,
        status: created.status,
        creatorUsername: account?.username ?? "",
        secondPlayerUsername: null,
        createdAt: created.createdAt,
      },
      ...current,
    ]);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <RequireSignIn onAction={() => setCreateOpen(true)}>
          {({ onClick }) => <Button onClick={onClick}>Create Game</Button>}
        </RequireSignIn>
      </div>

      {matches.length === 0 ? (
        <EmptyState message="No open matches right now" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {matches.map((match) => (
            <LobbyMatchCard
              key={match.id}
              id={match.id}
              creatorUsername={match.creatorUsername}
              creatorElo={null}
              boardSize={match.boardSize}
              moveTimeSeconds={match.moveTimeSeconds}
            />
          ))}
        </div>
      )}

      {isCreateOpen ? (
        <CreateGameModal gameConfigs={gameConfigs} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      ) : null}
    </div>
  );
}
