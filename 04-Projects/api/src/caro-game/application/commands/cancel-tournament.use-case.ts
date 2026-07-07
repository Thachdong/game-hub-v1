import { Inject, Injectable } from '@nestjs/common';
import {
  TOURNAMENT_REPOSITORY_PORT,
  ITournamentRepository,
} from '../../domain/ports/tournament.repository.port';
import {
  TOURNAMENT_REGISTRATION_REPOSITORY_PORT,
  ITournamentRegistrationRepository,
} from '../../domain/ports/tournament-registration.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import { TournamentNotFoundError } from '../../domain/errors';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TournamentCancelledEvent } from '../../domain/events/tournament.events';

@Injectable()
export class CancelTournamentUseCase {
  constructor(
    @Inject(TOURNAMENT_REPOSITORY_PORT)
    private readonly tournamentRepo: ITournamentRepository,
    @Inject(TOURNAMENT_REGISTRATION_REPOSITORY_PORT)
    private readonly registrationRepo: ITournamentRegistrationRepository,
    @Inject(REALTIME_ROOM_PORT)
    private readonly realtimeRoom: IRealtimeRoomPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(tournamentId: string): Promise<void> {
    const tournament = await this.tournamentRepo.findById(tournamentId);
    if (!tournament) throw new TournamentNotFoundError();

    const { items: registrations } = await this.registrationRepo.findAllByTournament(tournamentId, {
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
    });
    tournament.status = 'cancelled';
    await this.tournamentRepo.save(tournament);

    const registrantIds = registrations.map(r => r.playerId);
    this.eventEmitter.emit(
      'caro.tournament.cancelled',
      new TournamentCancelledEvent(tournamentId, registrantIds),
    );

    await this.realtimeRoom.pushToRoom(
      `tournament:${tournamentId}`,
      'tournament:status-changed',
      { tournamentId, status: 'cancelled' },
    );
  }
}
