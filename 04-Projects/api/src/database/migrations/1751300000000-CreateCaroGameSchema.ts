import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCaroGameSchema1751300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Seed Caro game into platform registry
    await queryRunner.query(`
      INSERT INTO platform.games (name, slug)
      VALUES ('Caro', 'caro')
      ON CONFLICT (slug) DO NOTHING
    `);

    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS caro_game`);

    await queryRunner.query(`
      CREATE TABLE caro_game.game_configs (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        board_size       VARCHAR(10) NOT NULL
                                     CHECK (board_size IN ('18x18', '25x25', '40x40')),
        move_time_seconds INT        NOT NULL
                                     CHECK (move_time_seconds IN (5, 10, 15, 25, 35, 45, 60)),
        active           BOOLEAN     NOT NULL DEFAULT TRUE,
        created_by       UUID        NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        deactivated_by   UUID,
        deactivated_at   TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_game_configs_active_combo
        ON caro_game.game_configs (board_size, move_time_seconds)
        WHERE active = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX idx_game_configs_active
        ON caro_game.game_configs (created_at ASC)
        WHERE active = TRUE
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.game_configs`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS caro_game`);
    // Does NOT remove the 'caro' platform.games row — other features may depend on it
  }
}
