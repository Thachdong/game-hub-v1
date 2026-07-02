import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_CREATOR_REQUEST_REPOSITORY_PORT,
  ITournamentCreatorRequestRepository,
} from '../../domain/ports/tournament-creator-request.repository.port';
import { TournamentCreatorRequest, TournamentCreatorRequestStatus } from '../../domain/entities/tournament-creator-request';

@Injectable()
export class ListTournamentCreatorRequestsUseCase {
  constructor(
    @Inject(TOURNAMENT_CREATOR_REQUEST_REPOSITORY_PORT)
    private readonly requestRepo: ITournamentCreatorRequestRepository,
  ) {}

  async execute(status?: TournamentCreatorRequestStatus): Promise<TournamentCreatorRequest[]> {
    return this.requestRepo.findAll(status ?? 'pending');
  }
}
