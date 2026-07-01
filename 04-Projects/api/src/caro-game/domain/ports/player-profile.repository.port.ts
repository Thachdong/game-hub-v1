import { PlayerProfile } from '../entities/player-profile';

export const PLAYER_PROFILE_REPOSITORY_PORT = 'PLAYER_PROFILE_REPOSITORY_PORT';

export type MatchOutcome = 'win' | 'loss' | 'draw';

export interface IPlayerProfileRepositoryPort {
  findByPlayerId(playerId: string): Promise<PlayerProfile | null>;
  createWithElo1200(playerId: string): Promise<PlayerProfile>;
  /** Atomically applies ELO delta and increments the appropriate outcome counter.
   *  Returns the new ELO. Throws if no profile exists. */
  updateEloAtomic(playerId: string, delta: number, outcome: MatchOutcome): Promise<number>;
  findTopN(n: number): Promise<PlayerProfile[]>;
}
