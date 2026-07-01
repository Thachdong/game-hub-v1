export const FRIEND_CHECK_PORT = 'FRIEND_CHECK_PORT';

export interface IFriendCheckPort {
  areFriends(playerAId: string, playerBId: string): Promise<boolean>;
}
