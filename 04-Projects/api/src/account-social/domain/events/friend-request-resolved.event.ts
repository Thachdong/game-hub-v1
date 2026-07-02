export class FriendRequestResolvedEvent {
  static readonly EVENT_NAME = 'friend-request.resolved';

  constructor(
    public readonly requestId: string,
    public readonly senderId: string,
    public readonly receiverId: string,
    public readonly resolution: 'accepted' | 'rejected',
    public readonly resolvedAt: Date,
  ) {}
}
