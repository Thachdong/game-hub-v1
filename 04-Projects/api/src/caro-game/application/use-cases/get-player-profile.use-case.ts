import { Inject, Injectable } from '@nestjs/common';
import { PLAYER_PROFILE_REPOSITORY_PORT, IPlayerProfileRepositoryPort } from '../../domain/ports/player-profile.repository.port';
import { PlayerProfile } from '../../domain/entities/player-profile';

@Injectable()
export class GetPlayerProfileUseCase {
  constructor(
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT) private readonly profileRepo: IPlayerProfileRepositoryPort,
  ) {}

  async execute(playerId: string): Promise<PlayerProfile | null> {
    return this.profileRepo.findByPlayerId(playerId);
  }
}
