export type TournamentRegistrationStatus = 'idle' | 'in_match';

export class TournamentRegistration {
  id: string;
  tournamentId: string;
  playerId: string;
  eloAtRegistration: number;
  tournamentPoints: number;
  winStreak: number;
  status: TournamentRegistrationStatus;
  isPaused: boolean;
  registeredAt: Date;
}
