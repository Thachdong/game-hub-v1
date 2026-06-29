import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IFriendshipRepository } from '@domain/ports/friendship.repository.port';
import { Friendship } from '@domain/entities/friendship';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FriendshipTypeOrmRepository implements IFriendshipRepository {
  constructor(private readonly dataSource: DataSource) {}

  async insert(accountIdA: string, accountIdB: string): Promise<Friendship> {
    const [id1, id2] =
      accountIdA < accountIdB ? [accountIdA, accountIdB] : [accountIdB, accountIdA];

    const rows: Friendship[] = await this.dataSource.query(
      `INSERT INTO account_social.friendships(id, account_id_1, account_id_2)
       VALUES($1, $2, $3)
       RETURNING id, account_id_1 AS "accountId1", account_id_2 AS "accountId2",
                 created_at AS "createdAt"`,
      [uuidv4(), id1, id2],
    );
    return rows[0];
  }

  async existsBetween(accountIdA: string, accountIdB: string): Promise<boolean> {
    const [id1, id2] =
      accountIdA < accountIdB ? [accountIdA, accountIdB] : [accountIdB, accountIdA];

    const rows: Array<{ exists: boolean }> = await this.dataSource.query(
      `SELECT EXISTS(
         SELECT 1 FROM account_social.friendships
         WHERE account_id_1 = $1 AND account_id_2 = $2
       ) AS exists`,
      [id1, id2],
    );
    return rows[0].exists;
  }

  async findByAccount(accountId: string): Promise<{ peerId: string }[]> {
    const rows: Array<{ account_id_1: string; account_id_2: string }> =
      await this.dataSource.query(
        `SELECT account_id_1, account_id_2
         FROM account_social.friendships
         WHERE account_id_1 = $1 OR account_id_2 = $1`,
        [accountId],
      );
    return rows.map((r) => ({
      peerId: r.account_id_1 === accountId ? r.account_id_2 : r.account_id_1,
    }));
  }
}
