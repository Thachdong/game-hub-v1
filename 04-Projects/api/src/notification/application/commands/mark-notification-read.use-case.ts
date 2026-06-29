import { Injectable, Inject, Optional } from '@nestjs/common';
import { NOTIFICATION_REPO, INotificationRepository } from '../../domain/ports/notification.repository.port';
import { REALTIME_PUSH_PORT, IRealtimePushPort } from '../../../realtime/realtime-push.port';
import { Notification } from '../../domain/entities/notification';
import { NotificationNotFoundError, ForbiddenNotificationError } from '../../domain/errors';

export interface MarkNotificationReadInput {
  notificationId: string;
  callerId: string;
}

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPO) private readonly notificationRepo: INotificationRepository,
    @Optional() @Inject(REALTIME_PUSH_PORT) private readonly realtimePushPort: IRealtimePushPort | null,
  ) {}

  async execute(input: MarkNotificationReadInput): Promise<Notification> {
    const notification = await this.notificationRepo.findById(input.notificationId);
    if (!notification) {
      throw new NotificationNotFoundError();
    }

    if (notification.recipientId !== input.callerId) {
      throw new ForbiddenNotificationError();
    }

    const updated = await this.notificationRepo.markAsRead(input.notificationId);

    if (this.realtimePushPort) {
      try {
        const unreadCount = await this.notificationRepo.countUnread(updated.recipientId);
        await this.realtimePushPort.pushToUser(updated.recipientId, 'notification.unread-count', {
          unreadCount,
        });
      } catch {
        // push failure must not affect HTTP response
      }
    }

    return updated;
  }
}
