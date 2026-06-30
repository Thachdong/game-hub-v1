import { GameConfig, BoardSize, MoveTimeSeconds } from '../entities/game-config';

export const GAME_CONFIG_REPOSITORY_PORT = 'GAME_CONFIG_REPOSITORY_PORT';

export interface IGameConfigRepositoryPort {
  findAllActive(): Promise<GameConfig[]>;
  findAll(): Promise<GameConfig[]>;
  findById(id: string): Promise<GameConfig | null>;
  save(data: { boardSize: BoardSize; moveTimeSeconds: MoveTimeSeconds; createdBy: string }): Promise<GameConfig>;
  update(id: string, fields: { boardSize?: BoardSize; moveTimeSeconds?: MoveTimeSeconds }): Promise<GameConfig>;
  deactivate(id: string, deactivatedBy: string): Promise<GameConfig>;
  reactivate(id: string): Promise<GameConfig>;
}
