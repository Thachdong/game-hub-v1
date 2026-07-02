import { Inject, Injectable } from '@nestjs/common';
import {
  FRIEND_REQUEST_REPO,
  IFriendRequestRepository,
} from '@domain/ports/friend-request.repository.port';
import {
  FRIENDSHIP_REPO,
  IFriendshipRepository,
} from '@domain/ports/friendship.repository.port';
import {
  EVENT_PUBLISHER_PORT,
  IEventPublisherPort,
} from '@domain/ports/event-publisher.port';
import { ACCOUNT_REPO, IAccountRepository } from '@domain/ports/account.repository.port';
import { FriendRequest, FriendRequestStatus } from '@domain/entities/friend-request';
import { FriendRequestResolvedEvent } from '@domain/events/friend-request-resolved.event';
import {
  FriendRequestNotFoundError,
  ForbiddenDomainError,
  AlreadyFriendsError,
} from '@domain/errors';

@Injectable()
export class ResolveFriendRequestUseCase {
  constructor(
    @Inject(FRIEND_REQUEST_REPO) private readonly friendRequestRepo: IFriendRequestRepository,
    @Inject(FRIENDSHIP_REPO) private readonly friendshipRepo: IFriendshipRepository,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventPublisher: IEventPublisherPort,
    @Inject(ACCOUNT_REPO) private readonly accountRepo: IAccountRepository,
  ) {}

  async execute(
    callerId: string,
    requestId: string,
    action: 'accept' | 'reject',
  ): Promise<FriendRequest> {
    const request = await this.friendRequestRepo.findById(requestId);
    if (!request) throw new FriendRequestNotFoundError();

    if (request.receiverId !== callerId) throw new ForbiddenDomainError();

    const areFriends = await this.friendshipRepo.existsBetween(
      request.senderId,
      request.receiverId,
    );
    if (areFriends) throw new AlreadyFriendsError();

    if (action === 'accept') {
      await this.friendshipRepo.insert(request.senderId, request.receiverId);
    }

    const resolution = action === 'accept' ? 'accepted' : 'rejected';
    const resolvedAt = new Date();
    const newStatus =
      action === 'accept' ? FriendRequestStatus.ACCEPTED : FriendRequestStatus.REJECTED;
    const updated = await this.friendRequestRepo.updateStatus(requestId, newStatus, resolvedAt);

    await this.eventPublisher.publish(
      FriendRequestResolvedEvent.EVENT_NAME,
      new FriendRequestResolvedEvent(
        requestId,
        request.senderId,
        request.receiverId,
        resolution,
        resolvedAt,
      ),
    );

    // Supplement: emit notification for the original sender
    const receiver = await this.accountRepo.findById(request.receiverId);
    const receiverUsername = receiver?.username ?? 'Someone';
    const notificationContent =
      action === 'accept'
        ? `${receiverUsername} accepted your friend request.`
        : `${receiverUsername} declined your friend request.`;

    await this.eventPublisher.publish('notification.friend-or-game-invite', {
      recipientId: request.senderId,
      content: notificationContent,
      referenceId: request.id,
    });

    return updated;
  }
}
