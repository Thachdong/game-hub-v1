import { Injectable, Inject } from '@nestjs/common';
import {
  IGameConfigRepositoryPort,
  GAME_CONFIG_REPOSITORY_PORT,
} from '../../domain/ports/game-config.repository.port';
import { GameConfig } from '../../domain/entities/game-config';

@Injectable()
export class ListActiveGameConfigsUseCase {
  constructor(
    @Inject(GAME_CONFIG_REPOSITORY_PORT)
    private readonly repo: IGameConfigRepositoryPort,
  ) {}

  async execute(): Promise<GameConfig[]> {
    return this.repo.findAllActive();
  }
}
