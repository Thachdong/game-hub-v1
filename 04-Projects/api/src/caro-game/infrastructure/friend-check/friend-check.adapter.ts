import { Injectable } from '@nestjs/common';
import { FriendshipQueryService } from '../../../account-social/application/services/friendship-query.service';
import { IFriendCheckPort } from '../../domain/ports/friend-check.port';

@Injectable()
export class FriendCheckAdapter implements IFriendCheckPort {
  constructor(private readonly friendshipQueryService: FriendshipQueryService) {}

  areFriends(playerAId: string, playerBId: string): Promise<boolean> {
    return this.friendshipQueryService.areFriends(playerAId, playerBId);
  }
}
