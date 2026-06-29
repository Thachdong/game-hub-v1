import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_REGISTRY_PORT,
  IGameRegistryPort,
  GameRef,
} from '@domain/ports/game-registry.port';
import {
  PLAYER_GAME_PROFILE_REPO,
  IPlayerGameProfileRepository,
} from '@domain/ports/player-game-profile.repository.port';

export type GameListEntry = GameRef & { hasProfile?: boolean };

@Injectable()
export class GetGameListUseCase {
  constructor(
    @Inject(GAME_REGISTRY_PORT) private readonly gameRegistry: IGameRegistryPort,
    @Inject(PLAYER_GAME_PROFILE_REPO) private readonly profileRepo: IPlayerGameProfileRepository,
  ) {}

  async execute(accountId?: string): Promise<GameListEntry[]> {
    const games = await this.gameRegistry.findAll();

    if (!accountId) {
      return games;
    }

    const gameIds = await this.profileRepo.findGameIdsByAccountId(accountId);
    const profileGameIds = new Set(gameIds);

    return games.map((game) => ({
      ...game,
      hasProfile: profileGameIds.has(game.id),
    }));
  }
}
