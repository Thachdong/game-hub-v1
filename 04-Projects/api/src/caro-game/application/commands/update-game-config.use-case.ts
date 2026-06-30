import { Injectable, Inject } from '@nestjs/common';
import {
  IGameConfigRepositoryPort,
  GAME_CONFIG_REPOSITORY_PORT,
} from '../../domain/ports/game-config.repository.port';
import { GameConfig, BoardSize, MoveTimeSeconds, VALID_BOARD_SIZES, VALID_MOVE_TIMES } from '../../domain/entities/game-config';
import {
  GameConfigNotFoundError,
  GameConfigInvalidBoardSizeError,
  GameConfigInvalidMoveTimeError,
} from '../../domain/errors';

export interface UpdateGameConfigCommand {
  id: string;
  boardSize?: string;
  moveTimeSeconds?: number;
}

@Injectable()
export class UpdateGameConfigUseCase {
  constructor(
    @Inject(GAME_CONFIG_REPOSITORY_PORT)
    private readonly repo: IGameConfigRepositoryPort,
  ) {}

  async execute(cmd: UpdateGameConfigCommand): Promise<GameConfig> {
    if (cmd.boardSize !== undefined && !(VALID_BOARD_SIZES as readonly string[]).includes(cmd.boardSize)) {
      throw new GameConfigInvalidBoardSizeError();
    }
    if (cmd.moveTimeSeconds !== undefined && !(VALID_MOVE_TIMES as readonly number[]).includes(cmd.moveTimeSeconds)) {
      throw new GameConfigInvalidMoveTimeError();
    }

    const existing = await this.repo.findById(cmd.id);
    if (!existing) throw new GameConfigNotFoundError();

    const fields: { boardSize?: BoardSize; moveTimeSeconds?: MoveTimeSeconds } = {};
    if (cmd.boardSize !== undefined) fields.boardSize = cmd.boardSize as BoardSize;
    if (cmd.moveTimeSeconds !== undefined) fields.moveTimeSeconds = cmd.moveTimeSeconds as MoveTimeSeconds;

    return this.repo.update(cmd.id, fields);
  }
}
