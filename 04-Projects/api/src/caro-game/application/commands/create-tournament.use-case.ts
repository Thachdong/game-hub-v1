import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_REPOSITORY_PORT,
  ITournamentRepository,
} from '../../domain/ports/tournament.repository.port';
import {
  GAME_CONFIG_REPOSITORY_PORT,
  IGameConfigRepositoryPort,
} from '../../domain/ports/game-config.repository.port';
import { GameConfigNotFoundError } from '../../domain/errors';
import { Tournament } from '../../domain/entities/tournament';

export interface CreateTournamentInput {
  creatorPlayerId: string;
  gameConfigId: string;
  minElo: number;
  startAt: Date;
  endAt: Date;
}

@Injectable()
export class CreateTournamentUseCase {
  constructor(
    @Inject(TOURNAMENT_REPOSITORY_PORT)
    private readonly tournamentRepo: ITournamentRepository,
    @Inject(GAME_CONFIG_REPOSITORY_PORT)
    private readonly gameConfigRepo: IGameConfigRepositoryPort,
  ) {}

  async execute(input: CreateTournamentInput): Promise<Tournament> {
    const now = new Date();
    if (input.startAt <= now) {
      throw new Error('startAt must be in the future');
    }
    if (input.endAt <= input.startAt) {
      throw new Error('endAt must be after startAt');
    }
    if (input.minElo < 0) {
      throw new Error('minElo must be >= 0');
    }

    const config = await this.gameConfigRepo.findById(input.gameConfigId);
    if (!config || !config.active) throw new GameConfigNotFoundError();

    return this.tournamentRepo.create({
      creatorPlayerId: input.creatorPlayerId,
      gameConfigId: input.gameConfigId,
      minElo: input.minElo,
      startAt: input.startAt,
      endAt: input.endAt,
    });
  }
}
