import { Inject, Injectable } from '@nestjs/common';
import {
  FRIENDSHIP_REPO,
  IFriendshipRepository,
} from '../../domain/ports/friendship.repository.port';
import { ACCOUNT_REPO, IAccountRepository } from '../../domain/ports/account.repository.port';
import { Account } from '../../domain/entities/account';

@Injectable()
export class GetFriendsUseCase {
  constructor(
    @Inject(FRIENDSHIP_REPO) private readonly friendshipRepo: IFriendshipRepository,
    @Inject(ACCOUNT_REPO) private readonly accountRepo: IAccountRepository,
  ) {}

  async execute(accountId: string): Promise<Account[]> {
    const friendships = await this.friendshipRepo.findByAccount(accountId);
    const accounts = await Promise.all(
      friendships.map((f) => this.accountRepo.findById(f.peerId)),
    );
    return accounts.filter((a): a is Account => a !== null);
  }
}
