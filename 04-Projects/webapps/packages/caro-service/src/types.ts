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

// --- Gameplay (FR-018) -------------------------------------------------------

export interface PlaceMoveResult extends CaroMove {
  isGameOver: boolean;
  result: string | null;
  winnerPlayerId: string | null;
}

// --- Quick pair (FR-019) ------------------------------------------------------

export interface QuickPairResult {
  status: "waiting" | "matched";
  requestId: string | null;
  matchId: string | null;
}

// --- Chat (FR-020) -------------------------------------------------------------

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  sentAt: string;
}

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

// --- Tournaments (FR-022) -------------------------------------------------------

export interface CreateTournamentInput {
  gameConfigId: string;
  minElo: number;
  startAt: string;
  endAt: string;
}
