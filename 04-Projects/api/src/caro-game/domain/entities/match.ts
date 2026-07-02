import { BoardSize, MoveTimeSeconds } from './game-config';

export type MatchStatus =
  | 'looking_for_opponent'
  | 'waiting_for_start'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type MatchVisibility = 'public' | 'private';

export type MatchResult = 'x_wins' | 'o_wins' | 'draw' | 'cancelled';

export class Match {
  id: string;
  configId: string;
  boardSize: BoardSize;
  moveTimeSeconds: MoveTimeSeconds;
  visibility: MatchVisibility;
  status: MatchStatus;
  creatorId: string;
  secondPlayerId: string | null;
  playerXId: string | null;
  playerOId: string | null;
  currentTurnPlayerId: string | null;
  pendingDrawRequestFromId: string | null;
  result: MatchResult | null;
  winnerPlayerId: string | null;
  playerXEloChange: number | null;
  playerOEloChange: number | null;
  deadlineAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  tournamentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
