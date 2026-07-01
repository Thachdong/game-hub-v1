export class TournamentMatch {
  id: string;
  tournamentId: string;
  matchId: string;
  whiteRegistrationId: string;
  blackRegistrationId: string;
  whitePointsAwarded: number | null;
  blackPointsAwarded: number | null;
  createdAt: Date;
  completedAt: Date | null;
}
