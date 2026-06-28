export interface IPlayerGameProfileRepository {
  upsert(accountId: string, gameId: string): Promise<void>;
  findGameIdsByAccountId(accountId: string): Promise<string[]>;
}

export const PLAYER_GAME_PROFILE_REPO = Symbol('PLAYER_GAME_PROFILE_REPO');
