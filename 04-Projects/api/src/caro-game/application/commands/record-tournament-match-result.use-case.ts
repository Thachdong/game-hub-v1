import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_MATCH_REPOSITORY_PORT,
  ITournamentMatchRepository,
} from '../../domain/ports/tournament-match.repository.port';
import {
  TOURNAMENT_REGISTRATION_REPOSITORY_PORT,
  ITournamentRegistrationRepository,
} from '../../domain/ports/tournament-registration.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import { calculateTournamentScore } from '../../domain/value-objects/tournament-score-calculator';

export interface RecordTournamentMatchResultInput {
  matchId: string;
  winnerId: string | null;
  isDraw: boolean;
  playerXId: string;
  playerOId: string;
}

@Injectable()
export class RecordTournamentMatchResultUseCase {
  constructor(
    @Inject(TOURNAMENT_MATCH_REPOSITORY_PORT)
    private readonly tournamentMatchRepo: ITournamentMatchRepository,
    @Inject(TOURNAMENT_REGISTRATION_REPOSITORY_PORT)
    private readonly registrationRepo: ITournamentRegistrationRepository,
    @Inject(REALTIME_ROOM_PORT)
    private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(input: RecordTournamentMatchResultInput): Promise<void> {
    const tournamentMatch = await this.tournamentMatchRepo.findByMatchId(input.matchId);
    if (!tournamentMatch) return; // Not a tournament match — no-op

    const [whiteReg, blackReg] = await Promise.all([
      this.registrationRepo.findByTournamentAndPlayer(
        tournamentMatch.tournamentId,
        input.playerXId,
      ),
      this.registrationRepo.findByTournamentAndPlayer(
        tournamentMatch.tournamentId,
        input.playerOId,
      ),
    ]);

    if (!whiteReg || !blackReg) return;

    const whiteResult = input.isDraw ? 'draw' : input.winnerId === input.playerXId ? 'win' : 'loss';
    const blackResult = input.isDraw ? 'draw' : input.winnerId === input.playerOId ? 'win' : 'loss';

    const whiteScore = calculateTournamentScore(whiteResult, whiteReg.winStreak);
    const blackScore = calculateTournamentScore(blackResult, blackReg.winStreak);

    // Constitution IV: atomic UPDATE col = col + delta (never read-compute-write at app layer)
    const [updatedWhite, updatedBlack] = await Promise.all([
      this.registrationRepo.atomicScoreUpdate(whiteReg.id, whiteScore.pointsAwarded, whiteScore.newStreak),
      this.registrationRepo.atomicScoreUpdate(blackReg.id, blackScore.pointsAwarded, blackScore.newStreak),
    ]);

    // Return both players to idle for re-pairing
    updatedWhite.status = 'idle';
    updatedBlack.status = 'idle';
    await Promise.all([
      this.registrationRepo.save(updatedWhite),
      this.registrationRepo.save(updatedBlack),
    ]);

    // Mark tournament match completed
    tournamentMatch.whitePointsAwarded = whiteScore.pointsAwarded;
    tournamentMatch.blackPointsAwarded = blackScore.pointsAwarded;
    tournamentMatch.completedAt = new Date();
    await this.tournamentMatchRepo.save(tournamentMatch);

    // Broadcast updated scores to tournament room
    await Promise.all([
      this.realtimeRoom.pushToRoom(
        `tournament:${tournamentMatch.tournamentId}`,
        'tournament:participant-updated',
        {
          tournamentId: tournamentMatch.tournamentId,
          playerId: input.playerXId,
          tournamentPoints: updatedWhite.tournamentPoints,
          winStreak: updatedWhite.winStreak,
        },
      ),
      this.realtimeRoom.pushToRoom(
        `tournament:${tournamentMatch.tournamentId}`,
        'tournament:participant-updated',
        {
          tournamentId: tournamentMatch.tournamentId,
          playerId: input.playerOId,
          tournamentPoints: updatedBlack.tournamentPoints,
          winStreak: updatedBlack.winStreak,
        },
      ),
    ]);
  }
}
