import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CreateNotificationUseCase } from '../../application/commands/create-notification.use-case';

interface NotificationEventPayload {
  recipientId: string;
  content: string;
  referenceId?: string;
}

@Injectable()
export class DomainEventListener {
  private readonly logger = new Logger(DomainEventListener.name);

  constructor(private readonly createNotification: CreateNotificationUseCase) {}

  @OnEvent('notification.friend-or-game-invite')
  async handleFriendOrGameInvite(payload: NotificationEventPayload): Promise<void> {
    await this.handleEvent('friend-or-game-invite', payload);
  }

  @OnEvent('notification.tournament-event')
  async handleTournamentEvent(payload: NotificationEventPayload): Promise<void> {
    await this.handleEvent('tournament-event', payload);
  }

  @OnEvent('notification.admin-warning')
  async handleAdminWarning(payload: NotificationEventPayload): Promise<void> {
    await this.handleEvent('admin-warning', payload);
  }

  @OnEvent('notification.trust-score-alert')
  async handleTrustScoreAlert(payload: NotificationEventPayload): Promise<void> {
    await this.handleEvent('trust-score-alert', payload);
  }

  private async handleEvent(type: string, payload: NotificationEventPayload): Promise<void> {
    try {
      await this.createNotification.execute({
        recipientId: payload.recipientId,
        type,
        content: payload.content,
        referenceId: payload.referenceId,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create notification (type=${type}, recipient=${payload.recipientId}): ${err}`,
      );
    }
  }
}
