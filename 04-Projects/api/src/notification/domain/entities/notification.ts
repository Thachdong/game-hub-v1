import { NotificationType } from './notification-type.enum';

export class Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  content: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: Date;
}
