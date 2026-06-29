import { Notification } from '../entities/notification';

export interface PaginationCursor {
  createdAt: Date;
  id: string;
}

export interface INotificationRepository {
  save(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
  findByRecipient(
    recipientId: string,
    pagination: { cursor?: PaginationCursor; limit: number },
  ): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  markAsRead(id: string): Promise<Notification>;
  countUnread(recipientId: string): Promise<number>;
}

export const NOTIFICATION_REPO = Symbol('INotificationRepository');
