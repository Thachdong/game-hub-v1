import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_REPOSITORY_PORT,
  ITournamentRepository,
} from '../../domain/ports/tournament.repository.port';
import { REALTIME_PUSH_PORT, IRealtimePushPort } from '../../../realtime/realtime-push.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import { TournamentMatchmakingService } from '../../infrastructure/matchmaking/tournament-matchmaking.service';

@Injectable()
export class PairIdlePlayersUseCase {
  constructor(
    @Inject(TOURNAMENT_REPOSITORY_PORT)
    private readonly tournamentRepo: ITournamentRepository,
    @Inject(REALTIME_PUSH_PORT)
    private readonly realtimePush: IRealtimePushPort,
    @Inject(REALTIME_ROOM_PORT)
    private readonly realtimeRoom: IRealtimeRoomPort,
    private readonly matchmakingService: TournamentMatchmakingService,
  ) {}

  async execute(tournamentId: string): Promise<void> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (!tournament || tournament.status !== 'in_progress') return;

    while (true) {
      const result = await this.matchmakingService.pairNextTwo(tournamentId);
      if (!result) break;

      const { match, tournamentMatch } = result;

      await this.realtimeRoom.pushToRoom(
        `tournament:${tournamentId}`,
        'tournament:match-created',
        { tournamentId, matchId: match.id },
      );

      await this.realtimePush.pushToUser(
        match.playerXId!,
        'match:started',
        { matchId: match.id, tournamentId },
      );
      await this.realtimePush.pushToUser(
        match.playerOId!,
        'match:started',
        { matchId: match.id, tournamentId },
      );
    }
  }
}
