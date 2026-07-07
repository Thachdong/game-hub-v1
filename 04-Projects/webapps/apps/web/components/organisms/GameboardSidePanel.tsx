"use client";

import type { CaroPlayerInMatch, MatchState } from "@game-hub/caro-service";
import { useAuthSession } from "@/components/templates/Providers";
import { PlayerCard } from "@/components/molecules/PlayerCard";
import { WaitingForOpponentCard } from "@/components/molecules/WaitingForOpponentCard";
import { StartCountdown } from "@/components/molecules/StartCountdown";
import { InGameActions } from "@/components/molecules/InGameActions";
import { ReportPlayerForm } from "@/components/molecules/ReportPlayerForm";
import { ViewerList, type ViewerEntry } from "@/components/organisms/ViewerList";
import { ChatBox } from "@/components/organisms/ChatBox";
import { MoveReplayControls } from "@/components/organisms/MoveReplayControls";

/** The four right-column layouts spec.md describes (data-model.md "GameboardViewState"). */
export type GameboardViewState = 1 | 2 | 3 | 4;

export function deriveViewState(status: string): GameboardViewState {
  switch (status) {
    case "looking_for_opponent":
      return 1;
    case "waiting_for_start":
      return 2;
    case "in_progress":
      return 3;
    case "completed":
    case "cancelled":
      return 4;
    default:
      return 1;
  }
}

/**
 * Dispatches to one of the four per-state right-column layouts based on `match.status`
 * (FR-003/FR-004/FR-007/FR-008), each also carrying the viewer list and chat box every state
 * shows (FR-010/FR-011).
 */
export function GameboardSidePanel({
  match,
  viewers,
  onMute,
  replayIndex,
  onReplayIndexChange,
  onStart,
  onRequestDraw,
  onSurrender,
  onRespondToDraw,
}: {
  match: MatchState;
  viewers: ViewerEntry[];
  onMute: (viewerId: string) => void;
  replayIndex: number | null;
  onReplayIndexChange: (index: number | null) => void;
  onStart: () => void;
  onRequestDraw: () => void;
  onSurrender: () => void;
  onRespondToDraw: (action: "accept" | "decline") => void;
}) {
  const { account } = useAuthSession();
  const viewState = deriveViewState(match.status);
  const isParticipant =
    account != null && (account.id === match.playerX?.id || account.id === match.playerO?.id);

  /**
   * `MatchState.playerX`/`playerO` are both `null` until a second player joins (the backend only
   * populates them once `JoinMatchUseCase` runs) — caught via live/manual testing (quickstart.md
   * item 8's spirit, T058), not covered in research.md's known-gaps list. Falls back to a
   * synthesized card from `creatorId` so state 1 still shows something for FR-003's "own player
   * card": the session's own username when the current viewer is the creator, otherwise
   * `PlayerCard`'s existing username-equals-id fallback (`Player {id.slice(0,6)}`).
   */
  function resolveState1OwnPlayer(): CaroPlayerInMatch {
    if (match.playerX) return match.playerX;
    const isCurrentViewerCreator = account?.id === match.creatorId;
    return {
      id: match.creatorId,
      username: isCurrentViewerCreator && account ? account.username : match.creatorId,
      elo: 0,
      winRate: 0,
    };
  }

  function resolveSenderUsername(senderId: string): string {
    if (match.playerX?.id === senderId) return match.playerX.username;
    if (match.playerO?.id === senderId) return match.playerO.username;
    const viewer = viewers.find((entry) => entry.id === senderId);
    if (viewer) return viewer.username;
    return `Player ${senderId.slice(0, 6)}`;
  }

  function renderPlayerCard(player: CaroPlayerInMatch) {
    const isSelf = player.id === account?.id;
    return (
      <div key={player.id} className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <PlayerCard
            id={player.id}
            username={player.username}
            elo={player.elo}
            winRate={player.winRate}
            isSelf={isSelf}
            isCurrentTurn={player.id === match.currentTurnPlayerId}
            isCreator={player.id === match.creatorId}
          />
        </div>
        {!isSelf ? <ReportPlayerForm reportedUserId={player.id} /> : null}
      </div>
    );
  }

  const viewerList = <ViewerList viewers={viewers} isParticipant={isParticipant} onMute={onMute} />;
  const chatBox = <ChatBox matchId={match.id} resolveSenderUsername={resolveSenderUsername} />;

  let stateContent;
  switch (viewState) {
    case 1:
      stateContent = (
        <>
          {renderPlayerCard(resolveState1OwnPlayer())}
          <WaitingForOpponentCard />
        </>
      );
      break;
    case 2:
      stateContent = (
        <>
          {match.playerX ? renderPlayerCard(match.playerX) : null}
          {match.playerO ? renderPlayerCard(match.playerO) : null}
          {match.deadlineAt ? (
            <StartCountdown
              deadlineAt={match.deadlineAt}
              creatorId={match.creatorId}
              playerXId={match.playerX?.id ?? null}
              playerOId={match.playerO?.id ?? null}
              onStart={onStart}
            />
          ) : null}
        </>
      );
      break;
    case 3:
      stateContent = (
        <>
          {match.playerX ? renderPlayerCard(match.playerX) : null}
          {match.playerO ? renderPlayerCard(match.playerO) : null}
          <InGameActions
            playerXId={match.playerX?.id ?? null}
            playerOId={match.playerO?.id ?? null}
            pendingDrawRequestFromId={match.pendingDrawRequestFromId}
            onRequestDraw={onRequestDraw}
            onSurrender={onSurrender}
            onRespondToDraw={onRespondToDraw}
          />
        </>
      );
      break;
    case 4:
      stateContent = (
        <>
          {match.playerX ? renderPlayerCard(match.playerX) : null}
          {match.playerO ? renderPlayerCard(match.playerO) : null}
          <MoveReplayControls
            totalMoves={match.moves.length}
            replayIndex={replayIndex}
            onReplayIndexChange={onReplayIndexChange}
          />
        </>
      );
      break;
  }

  return (
    <div data-testid={`gameboard-state-${viewState}`} className="flex flex-col gap-3">
      {stateContent}
      {viewerList}
      {chatBox}
    </div>
  );
}
