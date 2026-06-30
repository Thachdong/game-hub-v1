import { Injectable } from '@nestjs/common';
import { AccountExistenceService } from '../../../account-social/application/services/account-existence.service';
import { IAccountExistencePort } from '../../domain/ports/account-existence.port';

@Injectable()
export class AccountExistenceAdapter implements IAccountExistencePort {
  constructor(private readonly accountExistenceService: AccountExistenceService) {}

  async exists(accountId: string): Promise<boolean> {
    return this.accountExistenceService.exists(accountId);
  }
}
