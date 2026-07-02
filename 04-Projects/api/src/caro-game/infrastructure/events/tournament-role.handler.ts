import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TournamentCreatorRoleGrantedEvent,
  TournamentCreatorRoleRejectedEvent,
} from '../../domain/events/tournament.events';

@Injectable()
export class TournamentRoleHandler {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('caro.tournament.role.granted')
  onRoleGranted(event: TournamentCreatorRoleGrantedEvent): void {
    this.eventEmitter.emit('notification.tournament-event', {
      recipientId: event.playerId,
      content: 'Your Tournament Creator role request has been approved. You can now create tournaments.',
    });
  }

  @OnEvent('caro.tournament.role.rejected')
  onRoleRejected(event: TournamentCreatorRoleRejectedEvent): void {
    this.eventEmitter.emit('notification.tournament-event', {
      recipientId: event.playerId,
      content: 'Your Tournament Creator role request has been rejected.',
    });
  }
}
