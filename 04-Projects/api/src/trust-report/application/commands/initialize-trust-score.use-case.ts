import { Injectable, Inject } from '@nestjs/common';
import {
  ITrustScoreRepositoryPort,
  TRUST_SCORE_REPOSITORY_PORT,
} from '../../domain/ports/trust-score.repository.port';

export interface InitializeTrustScoreCommand {
  accountId: string;
}

@Injectable()
export class InitializeTrustScoreUseCase {
  constructor(
    @Inject(TRUST_SCORE_REPOSITORY_PORT)
    private readonly trustScoreRepo: ITrustScoreRepositoryPort,
  ) {}

  async execute(cmd: InitializeTrustScoreCommand): Promise<void> {
    await this.trustScoreRepo.initByAccountId(cmd.accountId);
  }
}
