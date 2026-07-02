import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InitializeTrustScoreUseCase } from '../../application/commands/initialize-trust-score.use-case';

@Injectable()
export class AccountCreatedListener {
  constructor(private readonly initializeTrustScore: InitializeTrustScoreUseCase) {}

  @OnEvent('account-social.account-created')
  async handleAccountCreated(payload: { accountId: string }): Promise<void> {
    await this.initializeTrustScore.execute({ accountId: payload.accountId });
  }
}
