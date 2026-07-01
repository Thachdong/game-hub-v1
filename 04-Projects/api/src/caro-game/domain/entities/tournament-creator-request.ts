export type TournamentCreatorRequestStatus = 'pending' | 'approved' | 'rejected';

export class TournamentCreatorRequest {
  id: string;
  playerId: string;
  status: TournamentCreatorRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}
