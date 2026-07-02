export type GameRef = {
  id: string;
  name: string;
  slug: string;
};

export interface IGameRegistryPort {
  findAll(): Promise<GameRef[]>;
  exists(gameId: string): Promise<boolean>;
}

export const GAME_REGISTRY_PORT = Symbol('GAME_REGISTRY_PORT');
