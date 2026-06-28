import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountSocialSchema1751000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS account_social`);

    await queryRunner.query(`
      CREATE TABLE account_social.accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR NOT NULL UNIQUE,
        username VARCHAR NOT NULL,
        avatar_url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE account_social.friend_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL,
        receiver_id UUID NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        resolved_at TIMESTAMPTZ,
        UNIQUE(sender_id, receiver_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX ON account_social.friend_requests(receiver_id, status)`);
    await queryRunner.query(`CREATE INDEX ON account_social.friend_requests(sender_id, status)`);

    await queryRunner.query(`
      CREATE TABLE account_social.friendships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id_1 UUID NOT NULL,
        account_id_2 UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(account_id_1, account_id_2)
      )
    `);
    await queryRunner.query(`CREATE INDEX ON account_social.friendships(account_id_1)`);
    await queryRunner.query(`CREATE INDEX ON account_social.friendships(account_id_2)`);

    await queryRunner.query(`
      CREATE TABLE account_social.game_admin_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL,
        game_id UUID NOT NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(account_id, game_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX ON account_social.game_admin_roles(account_id)`);

    await queryRunner.query(`
      CREATE TABLE account_social.player_game_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL,
        game_id UUID NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(account_id, game_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX ON account_social.player_game_profiles(account_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS account_social.player_game_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS account_social.game_admin_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS account_social.friendships`);
    await queryRunner.query(`DROP TABLE IF EXISTS account_social.friend_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS account_social.accounts`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS account_social`);
  }
}
