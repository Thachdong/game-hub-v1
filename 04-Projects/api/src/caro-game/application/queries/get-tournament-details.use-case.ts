import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_REPOSITORY_PORT,
  ITournamentRepository,
} from '../../domain/ports/tournament.repository.port';
import {
  GAME_CONFIG_REPOSITORY_PORT,
  IGameConfigRepositoryPort,
} from '../../domain/ports/game-config.repository.port';
import { TournamentNotFoundError } from '../../domain/errors';
import { Tournament } from '../../domain/entities/tournament';
import { GameConfig } from '../../domain/entities/game-config';

export interface TournamentDetails {
  tournament: Tournament;
  gameConfig: GameConfig | null;
  registrantCount: number;
}

@Injectable()
export class GetTournamentDetailsUseCase {
  constructor(
    @Inject(TOURNAMENT_REPOSITORY_PORT)
    private readonly tournamentRepo: ITournamentRepository,
    @Inject(GAME_CONFIG_REPOSITORY_PORT)
    private readonly gameConfigRepo: IGameConfigRepositoryPort,
  ) {}

  async execute(tournamentId: string): Promise<TournamentDetails> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (!tournament) throw new TournamentNotFoundError();

    const [gameConfig, registrantCount] = await Promise.all([
      this.gameConfigRepo.findById(tournament.gameConfigId),
      this.tournamentRepo.countRegistrants(tournamentId),
    ]);

    return { tournament, gameConfig, registrantCount };
  }
}
