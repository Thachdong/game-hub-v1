import { GameAdminRole } from '../entities/game-admin-role';

export interface IGameAdminRoleRepository {
  upsert(accountId: string, gameId: string): Promise<GameAdminRole>;
  delete(accountId: string, gameId: string): Promise<void>;
  findByAccountId(accountId: string): Promise<string[]>;
  existsForPair(accountId: string, gameId: string): Promise<boolean>;
}

export const GAME_ADMIN_ROLE_REPO = Symbol('GAME_ADMIN_ROLE_REPO');
