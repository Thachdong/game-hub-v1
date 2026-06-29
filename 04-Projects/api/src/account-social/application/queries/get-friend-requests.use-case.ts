import { Inject, Injectable } from '@nestjs/common';
import {
  FRIEND_REQUEST_REPO,
  IFriendRequestRepository,
} from '@domain/ports/friend-request.repository.port';
import { FriendRequest } from '@domain/entities/friend-request';

export interface FriendRequestsResult {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

@Injectable()
export class GetFriendRequestsUseCase {
  constructor(
    @Inject(FRIEND_REQUEST_REPO) private readonly friendRequestRepo: IFriendRequestRepository,
  ) {}

  async execute(accountId: string): Promise<FriendRequestsResult> {
    const [incoming, outgoing] = await Promise.all([
      this.friendRequestRepo.findPendingReceivedBy(accountId),
      this.friendRequestRepo.findPendingSentBy(accountId),
    ]);
    return { incoming, outgoing };
  }
}
