import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import { REALTIME_PUSH_PORT, IRealtimePushPort } from '../../../realtime/realtime-push.port';
import {
  MatchInvitationSentEvent,
  MatchInvitationDeclinedEvent,
} from '../../domain/events/match-invitation.events';

@Injectable()
export class MatchInvitationHandler {
  constructor(
    @Inject(REALTIME_PUSH_PORT) private readonly realtimePush: IRealtimePushPort,
  ) {}

  @OnEvent('caro.match.invitation.sent')
  async onInvitationSent(event: MatchInvitationSentEvent): Promise<void> {
    await this.realtimePush.pushToUser(event.toPlayerId, 'match:invitation', {
      matchId: event.matchId,
      fromPlayerId: event.fromPlayerId,
    });
  }

  @OnEvent('caro.match.invitation.declined')
  async onInvitationDeclined(event: MatchInvitationDeclinedEvent): Promise<void> {
    await this.realtimePush.pushToUser(event.toPlayerId, 'match:invitation_declined', {
      matchId: event.matchId,
      declinedBy: event.fromPlayerId,
    });
  }
}
