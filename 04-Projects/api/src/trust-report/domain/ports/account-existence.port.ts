export const ACCOUNT_EXISTENCE_PORT = 'ACCOUNT_EXISTENCE_PORT';

export interface IAccountExistencePort {
  exists(accountId: string): Promise<boolean>;
}
