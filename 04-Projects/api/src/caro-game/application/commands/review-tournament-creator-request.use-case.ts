import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TOURNAMENT_CREATOR_REQUEST_REPOSITORY_PORT,
  ITournamentCreatorRequestRepository,
} from '../../domain/ports/tournament-creator-request.repository.port';
import {
  PLAYER_PROFILE_REPOSITORY_PORT,
  IPlayerProfileRepositoryPort,
} from '../../domain/ports/player-profile.repository.port';
import {
  TournamentCreatorRequestNotFoundError,
  TournamentCreatorRequestNotPendingError,
} from '../../domain/errors';
import {
  TournamentCreatorRoleGrantedEvent,
  TournamentCreatorRoleRejectedEvent,
} from '../../domain/events/tournament.events';
import { TournamentCreatorRequest } from '../../domain/entities/tournament-creator-request';

export interface ReviewRequestInput {
  requestId: string;
  action: 'approve' | 'reject';
  adminPlayerId: string;
}

@Injectable()
export class ReviewTournamentCreatorRequestUseCase {
  constructor(
    @Inject(TOURNAMENT_CREATOR_REQUEST_REPOSITORY_PORT)
    private readonly requestRepo: ITournamentCreatorRequestRepository,
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT)
    private readonly profileRepo: IPlayerProfileRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ReviewRequestInput): Promise<TournamentCreatorRequest> {
    const request = await this.requestRepo.findById(input.requestId);
    if (!request) throw new TournamentCreatorRequestNotFoundError();
    if (request.status !== 'pending') throw new TournamentCreatorRequestNotPendingError();

    request.status = input.action === 'approve' ? 'approved' : 'rejected';
    request.reviewedBy = input.adminPlayerId;
    request.reviewedAt = new Date();

    const saved = await this.requestRepo.save(request);

    if (input.action === 'approve') {
      await this.profileRepo.updateTournamentCreatorFlag(request.playerId, true);
      this.eventEmitter.emit('caro.tournament.role.granted', new TournamentCreatorRoleGrantedEvent(request.playerId));
    } else {
      this.eventEmitter.emit('caro.tournament.role.rejected', new TournamentCreatorRoleRejectedEvent(request.playerId));
    }

    return saved;
  }
}
