import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { GAME_CONFIG_REPOSITORY_PORT, IGameConfigRepositoryPort } from '../../domain/ports/game-config.repository.port';
import { PLAYER_PROFILE_REPOSITORY_PORT, IPlayerProfileRepositoryPort } from '../../domain/ports/player-profile.repository.port';
import { GameConfigNotFoundError, PlayerAlreadyInActiveStateError } from '../../domain/errors';
import { Match } from '../../domain/entities/match';

interface CreateMatchInput {
  configId: string;
  visibility: 'public' | 'private';
  creatorId: string;
}

@Injectable()
export class CreateMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(GAME_CONFIG_REPOSITORY_PORT) private readonly configRepo: IGameConfigRepositoryPort,
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT) private readonly profileRepo: IPlayerProfileRepositoryPort,
  ) {}

  async execute(input: CreateMatchInput): Promise<Match> {
    const [config, activeMatch] = await Promise.all([
      this.configRepo.findById(input.configId),
      this.matchRepo.findActiveByPlayerId(input.creatorId),
    ]);

    if (!config || !config.active) throw new GameConfigNotFoundError();
    if (activeMatch) throw new PlayerAlreadyInActiveStateError();

    // Ensure player profile exists
    const profile = await this.profileRepo.findByPlayerId(input.creatorId);
    if (!profile) await this.profileRepo.createWithElo1200(input.creatorId);

    return this.matchRepo.save({
      configId: input.configId,
      boardSize: config.boardSize,
      moveTimeSeconds: config.moveTimeSeconds,
      visibility: input.visibility,
      creatorId: input.creatorId,
    });
  }
}
