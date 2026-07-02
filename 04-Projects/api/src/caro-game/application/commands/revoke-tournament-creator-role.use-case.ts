import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYER_PROFILE_REPOSITORY_PORT,
  IPlayerProfileRepositoryPort,
} from '../../domain/ports/player-profile.repository.port';
import { PlayerProfileNotFoundError } from '../../domain/errors';

@Injectable()
export class RevokeTournamentCreatorRoleUseCase {
  constructor(
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT)
    private readonly profileRepo: IPlayerProfileRepositoryPort,
  ) {}

  async execute(playerId: string): Promise<void> {
    const profile = await this.profileRepo.findByPlayerId(playerId);
    if (!profile || !profile.isTournamentCreator) {
      throw new PlayerProfileNotFoundError();
    }
    // FR-005: does NOT touch existing tournaments
    await this.profileRepo.updateTournamentCreatorFlag(playerId, false);
  }
}
