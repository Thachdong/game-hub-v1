import { Injectable, Inject } from '@nestjs/common';
import {
  ITrustScoreRepositoryPort,
  TRUST_SCORE_REPOSITORY_PORT,
} from '../../domain/ports/trust-score.repository.port';
import { ITrustStatusPort } from '../../domain/ports/trust-status.port';

@Injectable()
export class TrustStatusAdapter implements ITrustStatusPort {
  constructor(
    @Inject(TRUST_SCORE_REPOSITORY_PORT)
    private readonly trustScoreRepo: ITrustScoreRepositoryPort,
  ) {}

  async isLocked(accountId: string): Promise<{ locked: boolean; until: Date | null }> {
    const row = await this.trustScoreRepo.findByAccountId(accountId);
    const locked =
      row?.gameLockedUntil != null && row.gameLockedUntil > new Date();
    return { locked, until: row?.gameLockedUntil ?? null };
  }
}
