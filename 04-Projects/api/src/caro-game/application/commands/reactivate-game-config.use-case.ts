import { Injectable, Inject } from '@nestjs/common';
import {
  IGameConfigRepositoryPort,
  GAME_CONFIG_REPOSITORY_PORT,
} from '../../domain/ports/game-config.repository.port';
import { GameConfig } from '../../domain/entities/game-config';
import { GameConfigNotFoundError } from '../../domain/errors';

export interface ReactivateGameConfigCommand {
  id: string;
}

@Injectable()
export class ReactivateGameConfigUseCase {
  constructor(
    @Inject(GAME_CONFIG_REPOSITORY_PORT)
    private readonly repo: IGameConfigRepositoryPort,
  ) {}

  async execute(cmd: ReactivateGameConfigCommand): Promise<GameConfig> {
    const existing = await this.repo.findById(cmd.id);
    if (!existing) throw new GameConfigNotFoundError();
    return this.repo.reactivate(cmd.id);
  }
}
