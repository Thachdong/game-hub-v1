import { Injectable, Inject } from '@nestjs/common';
import {
  NOTIFICATION_REPO,
  INotificationRepository,
  PaginationCursor,
} from '../../domain/ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification';

export interface GetNotificationsInput {
  recipientId: string;
  limit: number;
  cursor?: PaginationCursor;
}

export interface GetNotificationsResult {
  items: Notification[];
  nextCursor: PaginationCursor | null;
}

@Injectable()
export class GetNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPO) private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(input: GetNotificationsInput): Promise<GetNotificationsResult> {
    const items = await this.notificationRepo.findByRecipient(input.recipientId, {
      cursor: input.cursor,
      limit: input.limit,
    });

    const nextCursor: PaginationCursor | null =
      items.length === input.limit
        ? { createdAt: items[items.length - 1].createdAt, id: items[items.length - 1].id }
        : null;

    return { items, nextCursor };
  }
}
