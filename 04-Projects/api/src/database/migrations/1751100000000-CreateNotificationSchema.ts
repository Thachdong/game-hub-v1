import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationSchema1751100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS notification`);

    await queryRunner.query(`
      CREATE TABLE notification.notifications (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_id UUID        NOT NULL,
        type         VARCHAR(50) NOT NULL
                                 CHECK (type IN (
                                   'friend-or-game-invite',
                                   'tournament-event',
                                   'admin-warning',
                                   'trust-score-alert'
                                 )),
        content      TEXT        NOT NULL CHECK (content <> ''),
        reference_id UUID,
        is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX ON notification.notifications (recipient_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX ON notification.notifications (recipient_id) WHERE is_read = FALSE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notification.notifications`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS notification`);
  }
}
