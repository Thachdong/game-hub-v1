export const QUICK_PAIR_REPOSITORY_PORT = 'QUICK_PAIR_REPOSITORY_PORT';

export interface QuickPairRequest {
  id: string;
  playerId: string;
  configId: string;
  boardSize: string;
  moveTimeSeconds: number;
  status: 'waiting' | 'matched' | 'cancelled';
  matchId: string | null;
  createdAt: Date;
}

export interface IQuickPairRepositoryPort {
  /** Create a new waiting request for the given player+config. */
  create(data: { playerId: string; configId: string; boardSize: string; moveTimeSeconds: number }): Promise<QuickPairRequest>;
  /** Find the oldest waiting request for the same config, excluding the given player; locks the row. */
  findWaitingOpponent(boardSize: string, moveTimeSeconds: number, excludePlayerId: string): Promise<QuickPairRequest | null>;
  /** Mark a request as matched with the given matchId. */
  markMatched(requestId: string, matchId: string): Promise<void>;
  /** Mark a request as cancelled. */
  cancel(requestId: string): Promise<void>;
  /** Find the active (waiting) request for a player. */
  findActiveByPlayerId(playerId: string): Promise<QuickPairRequest | null>;
}
