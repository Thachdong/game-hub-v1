export class PlayerProfile {
  id: string;
  playerId: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  isTournamentCreator: boolean;
  createdAt: Date;
  updatedAt: Date;
}
