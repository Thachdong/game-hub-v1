import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IFriendRequestRepository } from '@domain/ports/friend-request.repository.port';
import { FriendRequest, FriendRequestStatus } from '@domain/entities/friend-request';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FriendRequestTypeOrmRepository implements IFriendRequestRepository {
  constructor(private readonly dataSource: DataSource) {}

  async upsert(senderId: string, receiverId: string): Promise<FriendRequest> {
    const rows: FriendRequest[] = await this.dataSource.query(
      `INSERT INTO account_social.friend_requests(id, sender_id, receiver_id, status, created_at)
       VALUES($1, $2, $3, 'pending', now())
       ON CONFLICT(sender_id, receiver_id) DO UPDATE
         SET status = 'pending', resolved_at = NULL, created_at = now()
       RETURNING id, sender_id AS "senderId", receiver_id AS "receiverId",
                 status, created_at AS "createdAt", resolved_at AS "resolvedAt"`,
      [uuidv4(), senderId, receiverId],
    );
    return rows[0];
  }

  async findById(id: string): Promise<FriendRequest | null> {
    const rows: FriendRequest[] = await this.dataSource.query(
      `SELECT id, sender_id AS "senderId", receiver_id AS "receiverId",
              status, created_at AS "createdAt", resolved_at AS "resolvedAt"
       FROM account_social.friend_requests WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findPendingBetween(senderId: string, receiverId: string): Promise<FriendRequest | null> {
    const rows: FriendRequest[] = await this.dataSource.query(
      `SELECT id, sender_id AS "senderId", receiver_id AS "receiverId",
              status, created_at AS "createdAt", resolved_at AS "resolvedAt"
       FROM account_social.friend_requests
       WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [senderId, receiverId],
    );
    return rows[0] ?? null;
  }

  async findPendingSentBy(accountId: string): Promise<FriendRequest[]> {
    return this.dataSource.query(
      `SELECT id, sender_id AS "senderId", receiver_id AS "receiverId",
              status, created_at AS "createdAt", resolved_at AS "resolvedAt"
       FROM account_social.friend_requests
       WHERE sender_id = $1 AND status = 'pending'`,
      [accountId],
    );
  }

  async findPendingReceivedBy(accountId: string): Promise<FriendRequest[]> {
    return this.dataSource.query(
      `SELECT id, sender_id AS "senderId", receiver_id AS "receiverId",
              status, created_at AS "createdAt", resolved_at AS "resolvedAt"
       FROM account_social.friend_requests
       WHERE receiver_id = $1 AND status = 'pending'`,
      [accountId],
    );
  }

  async updateStatus(
    id: string,
    status: FriendRequestStatus,
    resolvedAt: Date,
  ): Promise<FriendRequest> {
    const rows: FriendRequest[] = await this.dataSource.query(
      `UPDATE account_social.friend_requests
       SET status = $1, resolved_at = $2
       WHERE id = $3
       RETURNING id, sender_id AS "senderId", receiver_id AS "receiverId",
                 status, created_at AS "createdAt", resolved_at AS "resolvedAt"`,
      [status, resolvedAt, id],
    );
    return rows[0];
  }
}
