import { Inject, Injectable } from '@nestjs/common';
import { ACCOUNT_REPO, IAccountRepository } from '../../domain/ports/account.repository.port';
import { Account } from '../../domain/entities/account';
import { AccountNotFoundError } from '../../domain/errors';

@Injectable()
export class GetAccountProfileUseCase {
  constructor(@Inject(ACCOUNT_REPO) private readonly accountRepo: IAccountRepository) {}

  async execute(accountId: string): Promise<Account> {
    const account = await this.accountRepo.findById(accountId);
    if (!account) throw new AccountNotFoundError();
    return account;
  }
}
