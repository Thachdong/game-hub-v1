import { Injectable, Inject } from '@nestjs/common';
import { TrustScore } from '../../domain/entities/trust-score';
import {
  ITrustScoreRepositoryPort,
  TRUST_SCORE_REPOSITORY_PORT,
} from '../../domain/ports/trust-score.repository.port';

export interface GetTrustScoreResult {
  trustScore: TrustScore;
  gameLocked: boolean;
}

@Injectable()
export class GetTrustScoreUseCase {
  constructor(
    @Inject(TRUST_SCORE_REPOSITORY_PORT)
    private readonly trustScoreRepo: ITrustScoreRepositoryPort,
  ) {}

  async execute(accountId: string): Promise<GetTrustScoreResult> {
    let trustScore = await this.trustScoreRepo.findByAccountId(accountId);
    if (!trustScore) {
      await this.trustScoreRepo.initByAccountId(accountId);
      trustScore = (await this.trustScoreRepo.findByAccountId(accountId))!;
    }
    const gameLocked =
      trustScore.gameLockedUntil !== null && trustScore.gameLockedUntil > new Date();
    return { trustScore, gameLocked };
  }
}
