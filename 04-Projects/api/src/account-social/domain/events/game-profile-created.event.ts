export class GameProfileCreatedEvent {
  static readonly EVENT_NAME = 'game.profile.created';

  constructor(
    public readonly accountId: string,
    public readonly gameId: string,
  ) {}
}
