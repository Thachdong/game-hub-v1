import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { FRIEND_CHECK_PORT, IFriendCheckPort } from '../../domain/ports/friend-check.port';
import { MatchInvitationSentEvent } from '../../domain/events/match-invitation.events';
import {
  MatchNotFoundError,
  NotMatchCreatorError,
  MatchNotInExpectedStatusError,
  NotFriendsError,
  PlayerAlreadyInActiveStateError,
} from '../../domain/errors';

interface InvitePlayerInput {
  matchId: string;
  requesterId: string;
  friendId: string;
}

interface InvitePlayerResult {
  matchId: string;
  invitedPlayerId: string;
}

@Injectable()
export class InvitePlayerUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(FRIEND_CHECK_PORT) private readonly friendCheck: IFriendCheckPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: InvitePlayerInput): Promise<InvitePlayerResult> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.creatorId !== input.requesterId) throw new NotMatchCreatorError();
    if (match.status !== 'looking_for_opponent') {
      throw new MatchNotInExpectedStatusError('looking_for_opponent', match.status);
    }

    const [areFriends, friendActiveMatch] = await Promise.all([
      this.friendCheck.areFriends(input.requesterId, input.friendId),
      this.matchRepo.findActiveByPlayerId(input.friendId),
    ]);

    if (!areFriends) throw new NotFriendsError();
    if (friendActiveMatch) throw new PlayerAlreadyInActiveStateError();

    this.eventEmitter.emit(
      'caro.match.invitation.sent',
      new MatchInvitationSentEvent(input.matchId, input.requesterId, input.friendId),
    );

    return { matchId: input.matchId, invitedPlayerId: input.friendId };
  }
}
