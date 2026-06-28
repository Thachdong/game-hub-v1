import { Friendship } from '../entities/friendship';

export interface IFriendshipRepository {
  existsBetween(accountIdA: string, accountIdB: string): Promise<boolean>;
  insert(accountIdA: string, accountIdB: string): Promise<Friendship>;
  findByAccount(accountId: string): Promise<{ peerId: string }[]>;
}

export const FRIENDSHIP_REPO = Symbol('FRIENDSHIP_REPO');
