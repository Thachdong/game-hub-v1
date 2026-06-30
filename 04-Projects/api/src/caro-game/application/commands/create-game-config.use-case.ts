import { Injectable, Inject } from '@nestjs/common';
import {
  IGameConfigRepositoryPort,
  GAME_CONFIG_REPOSITORY_PORT,
} from '../../domain/ports/game-config.repository.port';
import { GameConfig, BoardSize, MoveTimeSeconds, VALID_BOARD_SIZES, VALID_MOVE_TIMES } from '../../domain/entities/game-config';
import {
  GameConfigInvalidBoardSizeError,
  GameConfigInvalidMoveTimeError,
} from '../../domain/errors';

export interface CreateGameConfigCommand {
  boardSize: string;
  moveTimeSeconds: number;
  actorId: string;
}

@Injectable()
export class CreateGameConfigUseCase {
  constructor(
    @Inject(GAME_CONFIG_REPOSITORY_PORT)
    private readonly repo: IGameConfigRepositoryPort,
  ) {}

  async execute(cmd: CreateGameConfigCommand): Promise<GameConfig> {
    if (!(VALID_BOARD_SIZES as readonly string[]).includes(cmd.boardSize)) {
      throw new GameConfigInvalidBoardSizeError();
    }
    if (!(VALID_MOVE_TIMES as readonly number[]).includes(cmd.moveTimeSeconds)) {
      throw new GameConfigInvalidMoveTimeError();
    }
    return this.repo.save({
      boardSize: cmd.boardSize as BoardSize,
      moveTimeSeconds: cmd.moveTimeSeconds as MoveTimeSeconds,
      createdBy: cmd.actorId,
    });
  }
}
