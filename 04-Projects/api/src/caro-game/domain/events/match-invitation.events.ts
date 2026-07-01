export class MatchInvitationSentEvent {
  constructor(
    public readonly matchId: string,
    public readonly fromPlayerId: string,
    public readonly toPlayerId: string,
  ) {}
}

export class MatchInvitationDeclinedEvent {
  constructor(
    public readonly matchId: string,
    public readonly fromPlayerId: string,
    public readonly toPlayerId: string,
  ) {}
}
