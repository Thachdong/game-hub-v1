import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotificationOrmEntity } from './typeorm-entities/notification.orm-entity';
import {
  INotificationRepository,
  PaginationCursor,
} from '../../domain/ports/notification.repository.port';
import { Notification } from '../../domain/entities/notification';
import { NotificationType } from '../../domain/entities/notification-type.enum';

interface RawRow {
  id: string;
  recipient_id: string;
  type: string;
  content: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

@Injectable()
export class NotificationTypeOrmRepository implements INotificationRepository {
  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly repo: Repository<NotificationOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async save(data: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const row = this.repo.create({
      recipientId: data.recipientId,
      type: data.type,
      content: data.content,
      referenceId: data.referenceId,
      isRead: data.isRead,
    });
    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  async findByRecipient(
    recipientId: string,
    pagination: { cursor?: PaginationCursor; limit: number },
  ): Promise<Notification[]> {
    const { cursor, limit } = pagination;

    if (cursor) {
      const rows = await this.dataSource.query<RawRow[]>(
        `SELECT id, recipient_id, type, content, reference_id, is_read, created_at
         FROM notification.notifications
         WHERE recipient_id = $1
           AND (created_at, id) < ($2, $3)
         ORDER BY created_at DESC, id DESC
         LIMIT $4`,
        [recipientId, cursor.createdAt, cursor.id, limit],
      );
      return rows.map(this.toDomainRaw);
    }

    const rows = await this.dataSource.query<RawRow[]>(
      `SELECT id, recipient_id, type, content, reference_id, is_read, created_at
       FROM notification.notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [recipientId, limit],
    );
    return rows.map(this.toDomainRaw);
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async markAsRead(id: string): Promise<Notification> {
    const rows = await this.dataSource.query<RawRow[]>(
      `UPDATE notification.notifications
       SET is_read = TRUE
       WHERE id = $1
       RETURNING id, recipient_id, type, content, reference_id, is_read, created_at`,
      [id],
    );
    return this.toDomainRaw(rows[0]);
  }

  async countUnread(recipientId: string): Promise<number> {
    const result = await this.dataSource.query<[{ count: string }]>(
      `SELECT COUNT(*) as count
       FROM notification.notifications
       WHERE recipient_id = $1 AND is_read = FALSE`,
      [recipientId],
    );
    return parseInt(result[0].count, 10);
  }

  private toDomain(row: NotificationOrmEntity): Notification {
    const n = new Notification();
    n.id = row.id;
    n.recipientId = row.recipientId;
    n.type = row.type as NotificationType;
    n.content = row.content;
    n.referenceId = row.referenceId;
    n.isRead = row.isRead;
    n.createdAt = row.createdAt;
    return n;
  }

  private toDomainRaw = (row: RawRow): Notification => {
    const n = new Notification();
    n.id = row.id;
    n.recipientId = row.recipient_id;
    n.type = row.type as NotificationType;
    n.content = row.content;
    n.referenceId = row.reference_id ?? null;
    n.isRead = row.is_read;
    n.createdAt = new Date(row.created_at);
    return n;
  };
}
