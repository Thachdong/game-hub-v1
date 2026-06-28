import { FriendRequest, FriendRequestStatus } from '../entities/friend-request';

export interface IFriendRequestRepository {
  upsert(senderId: string, receiverId: string): Promise<FriendRequest>;
  findById(id: string): Promise<FriendRequest | null>;
  findPendingBetween(senderId: string, receiverId: string): Promise<FriendRequest | null>;
  findPendingSentBy(accountId: string): Promise<FriendRequest[]>;
  findPendingReceivedBy(accountId: string): Promise<FriendRequest[]>;
  updateStatus(id: string, status: FriendRequestStatus, resolvedAt: Date): Promise<FriendRequest>;
}

export const FRIEND_REQUEST_REPO = Symbol('FRIEND_REQUEST_REPO');
