"use client";

import { useState } from "react";
import type { MatchState } from "@game-hub/caro-service";
import { muteMatchViewerAction } from "@/lib/actions/caro";
import { useCaroRealtimeEvent } from "@/lib/useCaroRealtime";
import { GameboardTemplate } from "@/components/templates/GameboardTemplate";
import { GameBoard } from "@/components/organisms/GameBoard";
import { GameboardSidePanel, deriveViewState } from "@/components/organisms/GameboardSidePanel";
import type { ViewerEntry } from "@/components/organisms/ViewerList";

interface ViewerJoinedPayload {
  matchId: string;
  viewerId: string;
  viewerUsername: string;
}

interface ViewerLeftPayload {
  matchId: string;
  viewerId: string;
}

/**
 * Owns the gameboard's live match/viewer-list/replay state (a Server Component page can't hold
 * React state or realtime subscriptions itself) and composes `GameboardTemplate`'s two slots.
 * Seeded from the page's server-fetched `initialMatch`; kept live via the SSE bridge
 * (contracts/realtime-bridge-addendum.md).
 */
export function GameboardContainer({ initialMatch }: { initialMatch: MatchState }) {
  const [match] = useState(initialMatch);
  const [viewers, setViewers] = useState<ViewerEntry[]>([]);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);

  useCaroRealtimeEvent<ViewerJoinedPayload>(
    "match:viewer_joined",
    (payload) => {
      setViewers((current) =>
        current.some((entry) => entry.id === payload.viewerId)
          ? current
          : [...current, { id: payload.viewerId, username: payload.viewerUsername }]
      );
    },
    match.id
  );

  useCaroRealtimeEvent<ViewerLeftPayload>(
    "match:viewer_left",
    (payload) => {
      setViewers((current) => current.filter((entry) => entry.id !== payload.viewerId));
    },
    match.id
  );

  function handleMute(viewerId: string) {
    void muteMatchViewerAction({ matchId: match.id, viewerId });
  }

  const viewState = deriveViewState(match.status);

  return (
    <GameboardTemplate
      board={
        <GameBoard
          boardSize={match.boardSize}
          moves={match.moves}
          playerXId={match.playerX?.id ?? null}
          playerOId={match.playerO?.id ?? null}
          replayIndex={replayIndex ?? undefined}
          interactive={viewState === 3}
          currentTurnPlayerId={match.currentTurnPlayerId}
        />
      }
      sidePanel={
        <GameboardSidePanel
          match={match}
          viewers={viewers}
          onMute={handleMute}
          replayIndex={replayIndex}
          onReplayIndexChange={setReplayIndex}
          onStart={() => {}}
          onRequestDraw={() => {}}
          onSurrender={() => {}}
          onRespondToDraw={() => {}}
        />
      }
    />
  );
}
