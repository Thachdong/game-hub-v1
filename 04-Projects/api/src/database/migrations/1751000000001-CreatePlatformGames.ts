import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformGames1751000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS platform`);

    await queryRunner.query(`
      CREATE TABLE platform.games (
        id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        slug VARCHAR NOT NULL UNIQUE
      )
    `);

    await queryRunner.query(`
      INSERT INTO platform.games (name, slug) VALUES
        ('League of Legends', 'league-of-legends'),
        ('Valorant',          'valorant'),
        ('Teamfight Tactics', 'teamfight-tactics')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS platform.games`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS platform`);
  }
}
