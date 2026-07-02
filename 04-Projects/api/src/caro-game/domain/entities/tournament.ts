export type TournamentStatus = 'waiting' | 'in_progress' | 'ended' | 'cancelled';

export class Tournament {
  id: string;
  creatorPlayerId: string;
  gameConfigId: string;
  minElo: number;
  status: TournamentStatus;
  startAt: Date;
  endAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
