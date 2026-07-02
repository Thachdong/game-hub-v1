import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_CREATOR_REQUEST_REPOSITORY_PORT,
  ITournamentCreatorRequestRepository,
} from '../../domain/ports/tournament-creator-request.repository.port';
import {
  PLAYER_PROFILE_REPOSITORY_PORT,
  IPlayerProfileRepositoryPort,
} from '../../domain/ports/player-profile.repository.port';
import {
  TournamentCreatorRoleAlreadyExistsError,
  PendingRequestAlreadyExistsError,
} from '../../domain/errors';
import { TournamentCreatorRequest } from '../../domain/entities/tournament-creator-request';

@Injectable()
export class RequestTournamentCreatorRoleUseCase {
  constructor(
    @Inject(TOURNAMENT_CREATOR_REQUEST_REPOSITORY_PORT)
    private readonly requestRepo: ITournamentCreatorRequestRepository,
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT)
    private readonly profileRepo: IPlayerProfileRepositoryPort,
  ) {}

  async execute(playerId: string): Promise<TournamentCreatorRequest> {
    const profile = await this.profileRepo.findByPlayerId(playerId);
    if (profile?.isTournamentCreator) {
      throw new TournamentCreatorRoleAlreadyExistsError();
    }

    const pending = await this.requestRepo.findPendingByPlayerId(playerId);
    if (pending) {
      throw new PendingRequestAlreadyExistsError();
    }

    return this.requestRepo.create(playerId);
  }
}
