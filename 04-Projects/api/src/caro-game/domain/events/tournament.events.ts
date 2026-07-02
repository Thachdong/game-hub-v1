export class TournamentCreatorRoleGrantedEvent {
  constructor(public readonly playerId: string) {}
}

export class TournamentCreatorRoleRejectedEvent {
  constructor(public readonly playerId: string) {}
}

export class TournamentCancelledEvent {
  constructor(
    public readonly tournamentId: string,
    public readonly registrantPlayerIds: string[],
  ) {}
}

export class MatchCompletedEvent {
  constructor(
    public readonly matchId: string,
    public readonly tournamentId: string | null,
    public readonly winnerPlayerId: string | null,
    public readonly isDraw: boolean,
    public readonly playerXId: string,
    public readonly playerOId: string,
  ) {}
}
