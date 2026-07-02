import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RecordDailyRecoveryUseCase } from '../../application/commands/record-daily-recovery.use-case';

@Injectable()
export class RequestAuthenticatedListener {
  constructor(private readonly recordDailyRecovery: RecordDailyRecoveryUseCase) {}

  @OnEvent('auth.request-authenticated')
  async handleRequestAuthenticated(payload: { accountId: string }): Promise<void> {
    await this.recordDailyRecovery.execute({ accountId: payload.accountId });
  }
}
