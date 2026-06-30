import { TrustScore } from '../entities/trust-score';

export const TRUST_SCORE_REPOSITORY_PORT = 'TRUST_SCORE_REPOSITORY_PORT';

export interface ITrustScoreRepositoryPort {
  applyDeduction(
    accountId: string,
    points: number,
  ): Promise<{ oldScore: number; newScore: number; gameLockedUntil: Date | null }>;
  findByAccountId(accountId: string): Promise<TrustScore | null>;
  initByAccountId(accountId: string): Promise<void>;
  dailyRecovery(accountId: string): Promise<{ newScore: number } | null>;
}
