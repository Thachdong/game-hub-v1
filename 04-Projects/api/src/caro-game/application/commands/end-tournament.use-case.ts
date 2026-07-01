import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_REPOSITORY_PORT,
  ITournamentRepository,
} from '../../domain/ports/tournament.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import { TournamentNotFoundError } from '../../domain/errors';

@Injectable()
export class EndTournamentUseCase {
  constructor(
    @Inject(TOURNAMENT_REPOSITORY_PORT)
    private readonly tournamentRepo: ITournamentRepository,
    @Inject(REALTIME_ROOM_PORT)
    private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(tournamentId: string): Promise<void> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (!tournament) throw new TournamentNotFoundError();

    tournament.status = 'ended';
    tournament.endedAt = new Date();
    await this.tournamentRepo.save(tournament);

    await this.realtimeRoom.pushToRoom(
      `tournament:${tournamentId}`,
      'tournament:status-changed',
      { tournamentId, status: 'ended' },
    );
  }
}
