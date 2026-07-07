"use client";

import { useState } from "react";
import type { MatchState } from "@game-hub/caro-service";
import { getMatchAction, muteMatchViewerAction, startMatchAction } from "@/lib/actions/caro";
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

interface PlayerJoinedPayload {
  matchId: string;
  joinerId: string;
  playerXId: string;
  playerOId: string;
  deadlineAt: string;
}

interface MatchStartedPayload {
  matchId: string;
  currentTurnPlayerId: string;
  deadlineAt: string;
}

interface MatchCancelledPayload {
  matchId: string;
  reason: string;
}

/**
 * Owns the gameboard's live match/viewer-list/replay state (a Server Component page can't hold
 * React state or realtime subscriptions itself) and composes `GameboardTemplate`'s two slots.
 * Seeded from the page's server-fetched `initialMatch`; kept live via the SSE bridge
 * (contracts/realtime-bridge-addendum.md).
 */
export function GameboardContainer({ initialMatch }: { initialMatch: MatchState }) {
  const [match, setMatch] = useState(initialMatch);
  const [viewers, setViewers] = useState<ViewerEntry[]>([]);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);

  // match:player_joined's payload only carries ids (data-model.md's Realtime event contract), not
  // the joining player's username/elo/winRate — refetch full state to render their PlayerCard.
  useCaroRealtimeEvent<PlayerJoinedPayload>(
    "match:player_joined",
    (payload) => {
      void getMatchAction(payload.matchId).then((result) => {
        if (result.ok) setMatch(result.data);
      });
    },
    match.id
  );

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

  // US3: creator starts the match before the countdown expires, or it's auto-cancelled.
  useCaroRealtimeEvent<MatchStartedPayload>(
    "match:started",
    (payload) => {
      setMatch((current) => ({
        ...current,
        status: "in_progress",
        currentTurnPlayerId: payload.currentTurnPlayerId,
        deadlineAt: payload.deadlineAt,
      }));
    },
    match.id
  );

  useCaroRealtimeEvent<MatchCancelledPayload>(
    "match:cancelled",
    () => {
      setMatch((current) => ({ ...current, status: "cancelled", result: "cancelled", winnerPlayerId: null }));
    },
    match.id
  );

  function handleMute(viewerId: string) {
    void muteMatchViewerAction({ matchId: match.id, viewerId });
  }

  function handleStart() {
    void startMatchAction(match.id);
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
          onStart={handleStart}
          onRequestDraw={() => {}}
          onSurrender={() => {}}
          onRespondToDraw={() => {}}
        />
      }
    />
  );
}
