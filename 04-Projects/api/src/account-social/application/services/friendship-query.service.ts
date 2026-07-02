import { Injectable, Inject } from '@nestjs/common';
import { IFriendshipRepository, FRIENDSHIP_REPO } from '../../domain/ports/friendship.repository.port';

@Injectable()
export class FriendshipQueryService {
  constructor(
    @Inject(FRIENDSHIP_REPO) private readonly friendshipRepo: IFriendshipRepository,
  ) {}

  async areFriends(playerAId: string, playerBId: string): Promise<boolean> {
    return this.friendshipRepo.existsBetween(playerAId, playerBId);
  }
}
