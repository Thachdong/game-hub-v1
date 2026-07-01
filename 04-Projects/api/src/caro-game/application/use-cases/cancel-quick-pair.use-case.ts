import { Inject, Injectable } from '@nestjs/common';
import { QUICK_PAIR_REPOSITORY_PORT, IQuickPairRepositoryPort } from '../../domain/ports/quick-pair.repository.port';
import { NoActiveQuickPairRequestError } from '../../domain/errors';

@Injectable()
export class CancelQuickPairUseCase {
  constructor(
    @Inject(QUICK_PAIR_REPOSITORY_PORT) private readonly quickPairRepo: IQuickPairRepositoryPort,
  ) {}

  async execute(playerId: string): Promise<void> {
    const request = await this.quickPairRepo.findActiveByPlayerId(playerId);
    if (!request) throw new NoActiveQuickPairRequestError();
    await this.quickPairRepo.cancel(request.id);
  }
}
