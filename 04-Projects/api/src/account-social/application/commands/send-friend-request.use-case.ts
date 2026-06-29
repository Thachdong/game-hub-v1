import { Inject, Injectable } from '@nestjs/common';
import { ACCOUNT_REPO, IAccountRepository } from '@domain/ports/account.repository.port';
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
import { FriendRequest } from '@domain/entities/friend-request';
import {
  AccountNotFoundError,
  SelfFriendRequestError,
  AlreadyFriendsError,
  FriendRequestDuplicateError,
} from '@domain/errors';

@Injectable()
export class SendFriendRequestUseCase {
  constructor(
    @Inject(ACCOUNT_REPO) private readonly accountRepo: IAccountRepository,
    @Inject(FRIEND_REQUEST_REPO) private readonly friendRequestRepo: IFriendRequestRepository,
    @Inject(FRIENDSHIP_REPO) private readonly friendshipRepo: IFriendshipRepository,
    @Inject(EVENT_PUBLISHER_PORT) private readonly eventPublisher: IEventPublisherPort,
  ) {}

  async execute(senderId: string, targetEmail: string): Promise<FriendRequest> {
    const sender = await this.accountRepo.findById(senderId);
    if (!sender) throw new AccountNotFoundError();

    const receiver = await this.accountRepo.findByEmail(targetEmail);
    if (!receiver) throw new AccountNotFoundError();

    if (senderId === receiver.id) throw new SelfFriendRequestError();

    const areFriends = await this.friendshipRepo.existsBetween(senderId, receiver.id);
    if (areFriends) throw new AlreadyFriendsError();

    const existing = await this.friendRequestRepo.findPendingBetween(senderId, receiver.id);
    if (existing) throw new FriendRequestDuplicateError();

    const request = await this.friendRequestRepo.upsert(senderId, receiver.id);

    await this.eventPublisher.publish('notification.friend-or-game-invite', {
      recipientId: receiver.id,
      content: `${sender.username} sent you a friend request.`,
      referenceId: request.id,
    });

    return request;
  }
}
