import { Injectable, Inject } from '@nestjs/common';
import {
  ITrustScoreRepositoryPort,
  TRUST_SCORE_REPOSITORY_PORT,
} from '../../domain/ports/trust-score.repository.port';

export interface RecordDailyRecoveryCommand {
  accountId: string;
}

@Injectable()
export class RecordDailyRecoveryUseCase {
  constructor(
    @Inject(TRUST_SCORE_REPOSITORY_PORT)
    private readonly trustScoreRepo: ITrustScoreRepositoryPort,
  ) {}

  async execute(cmd: RecordDailyRecoveryCommand): Promise<void> {
    await this.trustScoreRepo.dailyRecovery(cmd.accountId);
  }
}
