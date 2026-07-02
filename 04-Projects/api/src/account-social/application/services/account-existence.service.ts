import { Injectable, Inject } from '@nestjs/common';
import { ACCOUNT_REPO, IAccountRepository } from '../../domain/ports/account.repository.port';

@Injectable()
export class AccountExistenceService {
  constructor(
    @Inject(ACCOUNT_REPO) private readonly accountRepo: IAccountRepository,
  ) {}

  async exists(accountId: string): Promise<boolean> {
    const account = await this.accountRepo.findById(accountId);
    return account !== null;
  }
}
