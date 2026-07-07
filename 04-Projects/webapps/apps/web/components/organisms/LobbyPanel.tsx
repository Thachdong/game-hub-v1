"use client";

import { useState } from "react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { LobbyMatchCard } from "@/components/molecules/LobbyMatchCard";
import { useCaroRealtimeEvent } from "@/lib/useCaroRealtime";
import type { LobbyMatch } from "@game-hub/caro-service";

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
export function LobbyPanel({ initialMatches }: { initialMatches: LobbyMatch[] }) {
  const [matches, setMatches] = useState(initialMatches);

  useCaroRealtimeEvent<LobbyUpdatedPayload>("lobby:updated", (payload) => {
    if (payload.action === "joined" || payload.action === "filled" || payload.action === "cancelled") {
      setMatches((current) => current.filter((match) => match.id !== payload.matchId));
    }
  });

  if (matches.length === 0) {
    return <EmptyState message="No open matches right now" />;
  }

  return (
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
  );
}
