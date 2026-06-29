import { Account } from '../entities/account';

export interface IAccountRepository {
  findByEmail(email: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  save(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account>;
}

export const ACCOUNT_REPO = Symbol('ACCOUNT_REPO');
