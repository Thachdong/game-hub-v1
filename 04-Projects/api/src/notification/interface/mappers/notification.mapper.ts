import { Notification } from '../../domain/entities/notification';

export interface NotificationWireShape {
  id: string;
  type: string;
  content: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export class NotificationMapper {
  static toEntryDto(n: Notification): NotificationWireShape {
    return {
      id: n.id,
      type: n.type,
      content: n.content,
      referenceId: n.referenceId,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    };
  }

  static toRealtimePayload(n: Notification): NotificationWireShape {
    return NotificationMapper.toEntryDto(n);
  }
}
