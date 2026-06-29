export interface IAccountExistencePort {
  exists(accountId: string): Promise<boolean>;
}

export const ACCOUNT_EXISTENCE_PORT = Symbol('IAccountExistencePort');
