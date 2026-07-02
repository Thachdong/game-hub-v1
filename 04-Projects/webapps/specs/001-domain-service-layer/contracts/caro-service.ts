/**
 * Contract for `@game-hub/caro-service`. Covers FR-016–FR-022: game configs (incl. Caro-specific
 * admin), match lifecycle, gameplay, quick-pair, chat, leaderboard, player profiles, tournaments.
 */

import type { CursorPage, ServiceResult } from "./service-core";

// --- Game configs (FR-016) ---------------------------------------------------

export type BoardSize = "18x18" | "25x25" | "40x40";
export type MoveTimeSeconds = 5 | 10 | 15 | 25 | 35 | 45 | 60;

export interface GameConfig {
  id: string;
  boardSize: BoardSize;
  moveTimeSeconds: MoveTimeSeconds;
  createdAt: string;
}

export interface AdminGameConfig extends GameConfig {
  active: boolean;
  createdBy: string;
  updatedAt: string;
  deactivatedBy: string | null;
  deactivatedAt: string | null;
}

/** GET /api/caro/game-configs */
export declare function listGameConfigs(): Promise<ServiceResult<GameConfig[]>>;

/** GET /api/admin/caro/game-configs */
export declare function listGameConfigsAdmin(): Promise<ServiceResult<AdminGameConfig[]>>;

/** POST /api/admin/caro/game-configs */
export declare function createGameConfig(input: {
  boardSize: BoardSize;
  moveTimeSeconds: MoveTimeSeconds;
}): Promise<ServiceResult<AdminGameConfig>>;

/** PATCH /api/admin/caro/game-configs/{id} */
export declare function updateGameConfig(input: {
  id: string;
  boardSize?: BoardSize;
  moveTimeSeconds?: MoveTimeSeconds;
}): Promise<ServiceResult<AdminGameConfig>>;

/** DELETE /api/admin/caro/game-configs/{id} (deactivate) */
export declare function deactivateGameConfig(input: {
  id: string;
}): Promise<ServiceResult<AdminGameConfig>>;

/** POST /api/admin/caro/game-configs/{id}/reactivate */
export declare function reactivateGameConfig(input: {
  id: string;
}): Promise<ServiceResult<AdminGameConfig>>;

// --- Match lifecycle (FR-017) -----------------------------------------------

export interface LobbyMatch {
  id: string;
  boardSize: string;
  moveTimeSeconds: number;
  status: string;
  creatorUsername: string;
  secondPlayerUsername: string | null;
  createdAt: string;
}

export interface CaroPlayerInMatch {
  id: string;
  username: string;
  elo: number;
  winRate: number;
}

export interface CaroMove {
  playerId: string;
  row: number;
  col: number;
  sequenceNumber: number;
  placedAt: string;
}

export interface MatchState {
  id: string;
  boardSize: string;
  moveTimeSeconds: number;
  visibility: "public" | "private";
  status: string;
  creatorId: string;
  playerX: CaroPlayerInMatch | null;
  playerO: CaroPlayerInMatch | null;
  currentTurnPlayerId: string | null;
  /** Server-authoritative deadline; render countdowns from this value only (constitution Principle VI). */
  deadlineAt: string | null;
  moves: CaroMove[];
  viewers: string[];
  pendingDrawRequestFromId: string | null;
  result: string | null;
  winnerPlayerId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

/** GET /api/caro/matches/lobby */
export declare function listLobbyMatches(): Promise<ServiceResult<LobbyMatch[]>>;

/** POST /api/caro/matches */
export declare function createMatch(input: {
  configId: string;
  visibility: "public" | "private";
}): Promise<ServiceResult<{ id: string; configId: string; boardSize: string; moveTimeSeconds: number; visibility: string; status: string; creatorId: string; createdAt: string }>>;

/** POST /api/caro/matches/{id}/join */
export declare function joinMatch(input: {
  id: string;
}): Promise<ServiceResult<{ matchId: string; status: string }>>;

/** GET /api/caro/matches/{id} */
export declare function getMatch(input: { id: string }): Promise<ServiceResult<MatchState>>;

/** DELETE /api/caro/matches/{id}/leave (also covers cancel-by-creator) */
export declare function leaveMatch(input: {
  id: string;
}): Promise<ServiceResult<{ id: string; status: string }>>;

/** POST /api/caro/matches/{id}/invite */
export declare function inviteToMatch(input: {
  id: string;
  friendId: string;
}): Promise<ServiceResult<{ matchId: string; invitedPlayerId: string }>>;

/** PUT /api/caro/matches/{id}/invitation/respond */
export declare function respondToMatchInvitation(input: {
  id: string;
  action: "accept" | "decline";
}): Promise<ServiceResult<{ matchId: string; status: string }>>;

// --- Gameplay (FR-018) -------------------------------------------------------

export interface PlaceMoveResult extends CaroMove {
  isGameOver: boolean;
  result: string | null;
  winnerPlayerId: string | null;
}

/** POST /api/caro/matches/{id}/start */
export declare function startMatch(input: { id: string }): Promise<ServiceResult<MatchState>>;

/** POST /api/caro/matches/{id}/moves */
export declare function submitMove(input: {
  id: string;
  row: number;
  col: number;
}): Promise<ServiceResult<PlaceMoveResult>>;

/** POST /api/caro/matches/{id}/surrender */
export declare function surrenderMatch(input: {
  id: string;
}): Promise<ServiceResult<MatchState>>;

/** POST /api/caro/matches/{id}/draw-request */
export declare function requestDraw(input: {
  id: string;
}): Promise<ServiceResult<MatchState>>;

/** PUT /api/caro/matches/{id}/draw-request/respond */
export declare function respondToDrawRequest(input: {
  id: string;
  action: "accept" | "decline";
}): Promise<ServiceResult<MatchState>>;

// --- Quick pair (FR-019) ------------------------------------------------------

export interface QuickPairResult {
  status: "waiting" | "matched";
  requestId: string | null;
  matchId: string | null;
}

/** POST /api/caro/quick-pair */
export declare function requestQuickPair(input: {
  configId: string;
}): Promise<ServiceResult<QuickPairResult>>;

/** DELETE /api/caro/quick-pair (cancel) */
export declare function cancelQuickPair(): Promise<ServiceResult<void>>;

// --- Chat (FR-020) -------------------------------------------------------------

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  sentAt: string;
}

/** GET /api/caro/matches/{matchId}/chat */
export declare function listMatchChat(input: {
  matchId: string;
}): Promise<ServiceResult<ChatMessage[]>>;

/** POST /api/caro/matches/{matchId}/chat */
export declare function sendMatchChat(input: {
  matchId: string;
  content: string;
}): Promise<ServiceResult<ChatMessage>>;

/** POST /api/caro/matches/{matchId}/chat/mute */
export declare function muteMatchViewer(input: {
  matchId: string;
  viewerId: string;
}): Promise<ServiceResult<void>>;

// --- Leaderboard & player profiles (FR-021) ------------------------------------

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export interface CaroPlayerProfile {
  playerId: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  createdAt: string;
}

export interface CaroMatchHistoryItem {
  id: string;
  boardSize: string;
  moveTimeSeconds: number;
  result: string | null;
  winnerPlayerId: string | null;
  playerXEloChange: number | null;
  playerOEloChange: number | null;
  startedAt: string | null;
  endedAt: string | null;
}

/** GET /api/caro/leaderboard */
export declare function getLeaderboard(): Promise<ServiceResult<LeaderboardEntry[]>>;

/** GET /api/caro/players/me */
export declare function getMyPlayerProfile(): Promise<ServiceResult<CaroPlayerProfile>>;

/** GET /api/caro/players/{playerId} */
export declare function getPlayerProfile(input: {
  playerId: string;
}): Promise<ServiceResult<CaroPlayerProfile>>;

/** GET /api/caro/players/me/history */
export declare function getMyMatchHistory(input?: {
  cursor?: { createdAt: string; id: string };
}): Promise<ServiceResult<CursorPage<CaroMatchHistoryItem>>>;

/** GET /api/caro/players/{playerId}/history */
export declare function getPlayerMatchHistory(input: {
  playerId: string;
  cursor?: { createdAt: string; id: string };
}): Promise<ServiceResult<CursorPage<CaroMatchHistoryItem>>>;

// --- Tournaments (FR-022) -------------------------------------------------------
// NOTE: response shapes for this group should be re-verified against the live OpenAPI contract
// during /speckit-tasks — see data-model.md's note on this section.

export interface CreateTournamentInput {
  gameConfigId: string;
  minElo: number;
  startAt: string;
  endAt: string;
}

/** POST /api/caro/tournament-creator-requests */
export declare function requestTournamentCreatorStatus(): Promise<ServiceResult<unknown>>;

/** POST /api/caro/tournaments */
export declare function createTournament(
  input: CreateTournamentInput
): Promise<ServiceResult<unknown>>;

/** GET /api/caro/tournaments */
export declare function listTournaments(): Promise<ServiceResult<unknown[]>>;

/** GET /api/caro/tournaments/{tournamentId} */
export declare function getTournament(input: {
  tournamentId: string;
}): Promise<ServiceResult<unknown>>;

/** POST /api/caro/tournaments/{tournamentId}/registrations */
export declare function registerForTournament(input: {
  tournamentId: string;
}): Promise<ServiceResult<unknown>>;

/** GET /api/caro/tournaments/{tournamentId}/participants */
export declare function listTournamentParticipants(input: {
  tournamentId: string;
}): Promise<ServiceResult<unknown[]>>;

/** GET /api/caro/tournaments/{tournamentId}/chat, POST .../chat */
export declare function listTournamentChat(input: {
  tournamentId: string;
}): Promise<ServiceResult<ChatMessage[]>>;
export declare function sendTournamentChat(input: {
  tournamentId: string;
  content: string;
}): Promise<ServiceResult<ChatMessage>>;

/** GET /api/caro/admin/tournament-creator-requests */
export declare function listTournamentCreatorRequests(): Promise<ServiceResult<unknown[]>>;

/** PATCH /api/caro/admin/tournament-creator-requests/{requestId} */
export declare function reviewTournamentCreatorRequest(input: {
  requestId: string;
  action: "approve" | "reject";
}): Promise<ServiceResult<unknown>>;

/** DELETE /api/caro/admin/tournament-creators/{playerId} */
export declare function revokeTournamentCreator(input: {
  playerId: string;
}): Promise<ServiceResult<void>>;
