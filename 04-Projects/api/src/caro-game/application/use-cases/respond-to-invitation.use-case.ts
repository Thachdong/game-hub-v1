import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { PLAYER_PROFILE_REPOSITORY_PORT, IPlayerProfileRepositoryPort } from '../../domain/ports/player-profile.repository.port';
import { MatchInvitationDeclinedEvent } from '../../domain/events/match-invitation.events';
import {
  MatchNotFoundError,
  MatchNotInExpectedStatusError,
  PlayerAlreadyInActiveStateError,
} from '../../domain/errors';

interface RespondToInvitationInput {
  matchId: string;
  responderId: string;
  action: 'accept' | 'decline';
}

interface RespondToInvitationResult {
  matchId: string;
  status: string;
}

@Injectable()
export class RespondToInvitationUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT) private readonly profileRepo: IPlayerProfileRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: RespondToInvitationInput): Promise<RespondToInvitationResult> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.status !== 'looking_for_opponent') {
      throw new MatchNotInExpectedStatusError('looking_for_opponent', match.status);
    }

    if (input.action === 'decline') {
      this.eventEmitter.emit(
        'caro.match.invitation.declined',
        new MatchInvitationDeclinedEvent(input.matchId, input.responderId, match.creatorId),
      );
      return { matchId: input.matchId, status: 'declined' };
    }

    // Accept: check responder not already active
    const activeMatch = await this.matchRepo.findActiveByPlayerId(input.responderId);
    if (activeMatch) throw new PlayerAlreadyInActiveStateError();

    // Ensure profile exists
    const profile = await this.profileRepo.findByPlayerId(input.responderId);
    if (!profile) await this.profileRepo.createWithElo1200(input.responderId);

    // Randomly assign X/O
    const [playerXId, playerOId] =
      Math.random() < 0.5
        ? [match.creatorId, input.responderId]
        : [input.responderId, match.creatorId];

    const updated = await this.matchRepo.update(input.matchId, {
      secondPlayerId: input.responderId,
      playerXId,
      playerOId,
      status: 'waiting_for_start',
    });

    return { matchId: input.matchId, status: updated.status };
  }
}
