import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TournamentCancelledEvent } from '../../domain/events/tournament.events';

@Injectable()
export class TournamentCancelledHandler {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('caro.tournament.cancelled')
  handle(event: TournamentCancelledEvent): void {
    for (const playerId of event.registrantPlayerIds) {
      this.eventEmitter.emit('notification.tournament-event', {
        playerId,
        type: 'tournament_cancelled',
        tournamentId: event.tournamentId,
      });
    }
  }
}
