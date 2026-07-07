import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaroTournamentPause1751600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE caro_game.tournament_registrations
        ADD COLUMN is_paused boolean NOT NULL DEFAULT false
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE caro_game.tournament_registrations DROP COLUMN IF EXISTS is_paused
    `);
  }
}
