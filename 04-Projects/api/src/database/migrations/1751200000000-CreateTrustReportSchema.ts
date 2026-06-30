import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrustReportSchema1751200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS trust_report`);

    await queryRunner.query(`
      CREATE TABLE trust_report.report_types (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        name             TEXT        NOT NULL,
        deduction_points INT         NOT NULL CHECK (deduction_points BETWEEN 1 AND 100),
        active           BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_report_types_name UNIQUE (name)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_report_types_active ON trust_report.report_types (id) WHERE active = TRUE`,
    );

    await queryRunner.query(`
      CREATE TABLE trust_report.reports (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id      UUID        NOT NULL,
        reported_user_id UUID        NOT NULL,
        report_type_id   UUID        NOT NULL,
        context          TEXT        NOT NULL,
        status           VARCHAR(10) NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'valid', 'invalid')),
        applied_points   INT,
        submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        resolved_at      TIMESTAMPTZ,
        resolved_by      UUID,
        CONSTRAINT chk_reports_no_self_report CHECK (reporter_id != reported_user_id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_reports_pending ON trust_report.reports (submitted_at DESC, id DESC) WHERE status = 'pending'`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_reports_reported_user ON trust_report.reports (reported_user_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE trust_report.trust_scores (
        account_id         UUID        PRIMARY KEY,
        score              INT         NOT NULL DEFAULT 100 CHECK (score BETWEEN 0 AND 100),
        game_locked_until  TIMESTAMPTZ,
        last_recovery_date DATE,
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO trust_report.report_types (name, deduction_points)
      VALUES ('cheating', 20), ('harassment', 10)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS trust_report.trust_scores`);
    await queryRunner.query(`DROP TABLE IF EXISTS trust_report.reports`);
    await queryRunner.query(`DROP TABLE IF EXISTS trust_report.report_types`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS trust_report`);
  }
}
