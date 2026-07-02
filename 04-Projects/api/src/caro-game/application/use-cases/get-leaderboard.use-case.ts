import { Inject, Injectable } from '@nestjs/common';
import { PLAYER_PROFILE_REPOSITORY_PORT, IPlayerProfileRepositoryPort } from '../../domain/ports/player-profile.repository.port';
import { PlayerProfile } from '../../domain/entities/player-profile';

const TOP_N = 10;

@Injectable()
export class GetLeaderboardUseCase {
  constructor(
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT) private readonly profileRepo: IPlayerProfileRepositoryPort,
  ) {}

  async execute(): Promise<PlayerProfile[]> {
    return this.profileRepo.findTopN(TOP_N);
  }
}
