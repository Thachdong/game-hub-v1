import { Injectable, Inject, Optional } from '@nestjs/common';
import { NOTIFICATION_REPO, INotificationRepository } from '../../domain/ports/notification.repository.port';
import { ACCOUNT_EXISTENCE_PORT, IAccountExistencePort } from '../../domain/ports/account-existence.port';
import { REALTIME_PUSH_PORT, IRealtimePushPort } from '../../../realtime/realtime-push.port';
import { Notification } from '../../domain/entities/notification';
import { NotificationType } from '../../domain/entities/notification-type.enum';
import {
  InvalidNotificationTypeError,
  InvalidNotificationContentError,
  InvalidRecipientError,
} from '../../domain/errors';

export interface CreateNotificationInput {
  recipientId: string;
  type: string;
  content: string;
  referenceId?: string;
}

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPO) private readonly notificationRepo: INotificationRepository,
    @Inject(ACCOUNT_EXISTENCE_PORT) private readonly accountExistencePort: IAccountExistencePort,
    @Optional() @Inject(REALTIME_PUSH_PORT) private readonly realtimePushPort: IRealtimePushPort | null,
  ) {}

  async execute(input: CreateNotificationInput): Promise<Notification> {
    const validTypes = Object.values(NotificationType) as string[];
    if (!validTypes.includes(input.type)) {
      throw new InvalidNotificationTypeError(input.type);
    }

    if (!input.content || input.content.trim().length === 0) {
      throw new InvalidNotificationContentError();
    }

    const recipientExists = await this.accountExistencePort.exists(input.recipientId);
    if (!recipientExists) {
      throw new InvalidRecipientError(input.recipientId);
    }

    const saved = await this.notificationRepo.save({
      recipientId: input.recipientId,
      type: input.type as NotificationType,
      content: input.content,
      referenceId: input.referenceId ?? null,
      isRead: false,
    });

    if (this.realtimePushPort) {
      const payload = toWireShape(saved);
      try {
        await this.realtimePushPort.pushToUser(saved.recipientId, 'notification.new', payload);
      } catch {
        // push failure must not affect HTTP response
      }
      try {
        const unreadCount = await this.notificationRepo.countUnread(saved.recipientId);
        await this.realtimePushPort.pushToUser(saved.recipientId, 'notification.unread-count', {
          unreadCount,
        });
      } catch {
        // push failure must not affect HTTP response
      }
    }

    return saved;
  }
}

export function toWireShape(n: Notification): object {
  return {
    id: n.id,
    type: n.type,
    content: n.content,
    referenceId: n.referenceId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}
