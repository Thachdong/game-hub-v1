import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCaroMatchLeaderboard1751400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Matches ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE caro_game.matches (
        id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        config_id                   UUID        NOT NULL REFERENCES caro_game.game_configs(id),
        board_size                  VARCHAR(10) NOT NULL,
        move_time_seconds           SMALLINT    NOT NULL,
        visibility                  VARCHAR(10) NOT NULL,
        status                      VARCHAR(30) NOT NULL DEFAULT 'looking_for_opponent',
        creator_id                  UUID        NOT NULL,
        second_player_id            UUID,
        player_x_id                 UUID,
        player_o_id                 UUID,
        current_turn_player_id      UUID,
        pending_draw_request_from_id UUID,
        result                      VARCHAR(20),
        winner_player_id            UUID,
        player_x_elo_change         SMALLINT,
        player_o_elo_change         SMALLINT,
        deadline_at                 TIMESTAMPTZ,
        started_at                  TIMESTAMPTZ,
        ended_at                    TIMESTAMPTZ,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_caro_matches_status  ON caro_game.matches(status)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_caro_matches_creator ON caro_game.matches(creator_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_caro_matches_players ON caro_game.matches(player_x_id, player_o_id)
    `);

    // ── Match moves ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE caro_game.match_moves (
        id              UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id        UUID     NOT NULL REFERENCES caro_game.matches(id),
        player_id       UUID     NOT NULL,
        row             SMALLINT NOT NULL,
        col             SMALLINT NOT NULL,
        sequence_number INTEGER  NOT NULL,
        placed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (match_id, row, col),
        UNIQUE (match_id, sequence_number)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_caro_match_moves_match ON caro_game.match_moves(match_id, sequence_number)
    `);

    // ── Player profiles ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE caro_game.player_profiles (
        id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id      UUID    NOT NULL UNIQUE,
        elo            INTEGER NOT NULL DEFAULT 1200,
        matches_played INTEGER NOT NULL DEFAULT 0,
        wins           INTEGER NOT NULL DEFAULT 0,
        losses         INTEGER NOT NULL DEFAULT 0,
        draws          INTEGER NOT NULL DEFAULT 0,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_caro_player_profiles_elo ON caro_game.player_profiles(elo DESC)
    `);

    // ── Quick pair requests ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE caro_game.quick_pair_requests (
        id                UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id         UUID     NOT NULL,
        config_id         UUID     NOT NULL REFERENCES caro_game.game_configs(id),
        board_size        VARCHAR(10) NOT NULL,
        move_time_seconds SMALLINT NOT NULL,
        status            VARCHAR(20) NOT NULL DEFAULT 'waiting',
        match_id          UUID REFERENCES caro_game.matches(id),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_caro_quick_pair_waiting
        ON caro_game.quick_pair_requests(board_size, move_time_seconds, status, created_at)
        WHERE status = 'waiting'
    `);

    // ── Chat messages ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE caro_game.chat_messages (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id   UUID        NOT NULL REFERENCES caro_game.matches(id),
        sender_id  UUID        NOT NULL,
        content    VARCHAR(500) NOT NULL,
        sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_caro_chat_messages_match ON caro_game.chat_messages(match_id, sent_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.chat_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.quick_pair_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.player_profiles`);
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.match_moves`);
    await queryRunner.query(`DROP TABLE IF EXISTS caro_game.matches`);
  }
}
