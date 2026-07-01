import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaroTournament1751500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // ── tournaments ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE caro_game.tournaments (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        creator_player_id UUID        NOT NULL,
        game_config_id    UUID        NOT NULL REFERENCES caro_game.game_configs(id),
        min_elo           INTEGER     NOT NULL DEFAULT 0,
        status            VARCHAR(20) NOT NULL DEFAULT 'waiting',
        start_at          TIMESTAMPTZ NOT NULL,
        end_at            TIMESTAMPTZ NOT NULL,
        started_at        TIMESTAMPTZ,
        ended_at          TIMESTAMPTZ,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_caro_tournaments_status_start_at
        ON caro_game.tournaments(status, start_at)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_caro_tournaments_status_end_at
        ON caro_game.tournaments(status, end_at)
    `);

    // ── tournament_creator_requests ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE caro_game.tournament_creator_requests (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id   UUID        NOT NULL,
        status      VARCHAR(20) NOT NULL DEFAULT 'pending',
        reviewed_by UUID,
        reviewed_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_caro_tcr_player_id
        ON caro_game.tournament_creator_requests(player_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_caro_tcr_status
        ON caro_game.tournament_creator_requests(status)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_caro_tcr_one_pending_per_player
        ON caro_game.tournament_creator_requests(player_id)
        WHERE status = 'pending'
    `);

    // ── tournament_registrations ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE caro_game.tournament_registrations (
        id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id       UUID        NOT NULL REFERENCES caro_game.tournaments(id),
        player_id           UUID        NOT NULL,
        elo_at_registration INTEGER     NOT NULL,
        tournament_points   INTEGER     NOT NULL DEFAULT 0,
        win_streak          INTEGER     NOT NULL DEFAULT 0,
        status              VARCHAR(20) NOT NULL DEFAULT 'idle',
        registered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tournament_id, player_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_caro_tr_tournament_idle
        ON caro_game.tournament_registrations(tournament_id, status)
        WHERE status = 'idle'
    `);
    await queryRunner.query(`
      CREATE INDEX idx_caro_tr_tournament_points
        ON caro_game.tournament_registrations(tournament_id, tournament_points DESC)
    `);

    // ── tournament_matches ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE caro_game.tournament_matches (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id         UUID NOT NULL REFERENCES caro_game.tournaments(id),
        match_id              UUID NOT NULL UNIQUE REFERENCES caro_game.matches(id),
        white_registration_id UUID NOT NULL REFERENCES caro_game.tournament_registrations(id),
        black_registration_id UUID NOT NULL REFERENCES caro_game.tournament_registrations(id),
        white_points_awarded  INTEGER,
        black_points_awarded  INTEGER,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at          TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_caro_tm_tournament_id
        ON caro_game.tournament_matches(tournament_id)
    `);

    // ── tournament_chat_messages ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE caro_game.tournament_chat_messages (
        id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id    UUID         NOT NULL REFERENCES caro_game.tournaments(id),
        sender_player_id UUID         NOT NULL,
        content          VARCHAR(500) NOT NULL,
        sent_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_caro_tcm_tournament_sent
        ON caro_game.tournament_chat_messages(tournament_id, sent_at)
    `);

    // ── extend caro_game.matches ──────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE caro_game.matches
        ADD COLUMN tournament_id UUID REFERENCES caro_game.tournaments(id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_caro_matches_tournament_id
        ON caro_game.matches(tournament_id)
        WHERE tournament_id IS NOT NULL
    `);

    // ── extend caro_game.player_profiles ─────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE caro_game.player_profiles
        ADD COLUMN is_tournament_creator BOOLEAN NOT NULL DEFAULT FALSE
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE caro_game.player_profiles DROP COLUMN IF EXISTS is_tournament_creator`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_caro_matches_tournament_id`);
    await queryRunner.query(`ALTER TABLE caro_game.matches DROP COLUMN IF EXISTS tournament_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.tournament_chat_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.tournament_matches`);
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.tournament_registrations`);
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.tournament_creator_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.tournaments`);
  }
}
