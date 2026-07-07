import { Match, MatchResult, MatchStatus } from '../entities/match';
import { MatchMove } from '../entities/match-move';

export const MATCH_REPOSITORY_PORT = 'MATCH_REPOSITORY_PORT';

export interface CreateMatchData {
  configId: string;
  boardSize: string;
  moveTimeSeconds: number;
  visibility: 'public' | 'private';
  creatorId: string;
}

export interface UpdateMatchData {
  status?: MatchStatus;
  secondPlayerId?: string | null;
  playerXId?: string | null;
  playerOId?: string | null;
  currentTurnPlayerId?: string | null;
  pendingDrawRequestFromId?: string | null;
  result?: MatchResult | null;
  winnerPlayerId?: string | null;
  playerXEloChange?: number | null;
  playerOEloChange?: number | null;
  deadlineAt?: Date | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
}

export interface MatchHistoryCursor {
  endedAt: Date;
  id: string;
}

export interface MatchHistoryPage {
  matches: Match[];
  nextCursor: string | null;
}

export interface CreateTournamentMatchData {
  whitePlayerId: string;
  blackPlayerId: string;
  gameConfigId: string;
  tournamentId: string;
}

export interface IMatchRepositoryPort {
  findById(id: string): Promise<Match | null>;
  findActiveByPlayerId(playerId: string): Promise<Match | null>;
  findLobbyMatches(): Promise<Match[]>;
  findByPlayerIdHistory(playerId: string, limit: number, cursor?: MatchHistoryCursor): Promise<MatchHistoryPage>;
  save(data: CreateMatchData): Promise<Match>;
  update(id: string, data: UpdateMatchData): Promise<Match>;
  saveMove(data: { matchId: string; playerId: string; row: number; col: number; sequenceNumber: number }): Promise<MatchMove>;
  findMovesByMatchId(matchId: string): Promise<MatchMove[]>;
  findNextSequenceNumber(matchId: string): Promise<number>;
  /** Creates an auto-started tournament match (no lobby phase). */
  createTournamentMatch(data: CreateTournamentMatchData): Promise<Match>;
  /** `auto_starting` matches whose 5s auto-start deadline has already passed (research.md §4's restart-safety sweep). */
  findOverdueAutoStarting(now: Date): Promise<Match[]>;
}
