import { Injectable, Inject } from '@nestjs/common';
import { ACCOUNT_REPO, IAccountRepository } from '../../domain/ports/account.repository.port';

@Injectable()
export class AccountQueryService {
  constructor(
    @Inject(ACCOUNT_REPO) private readonly accountRepo: IAccountRepository,
  ) {}

  async getUsernameById(accountId: string): Promise<string | null> {
    const account = await this.accountRepo.findById(accountId);
    return account?.username ?? null;
  }

  async getUsernamesByIds(ids: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    await Promise.all(
      ids.map(async (id) => {
        const acc = await this.accountRepo.findById(id);
        if (acc) result.set(id, acc.username);
      }),
    );
    return result;
  }
}
