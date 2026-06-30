import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TrustScoreOrmEntity } from './typeorm-entities/trust-score.orm-entity';
import { ITrustScoreRepositoryPort } from '../../domain/ports/trust-score.repository.port';
import { TrustScore } from '../../domain/entities/trust-score';

@Injectable()
export class TrustScoreOrmRepository implements ITrustScoreRepositoryPort {
  constructor(
    @InjectRepository(TrustScoreOrmEntity)
    private readonly repo: Repository<TrustScoreOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async applyDeduction(
    accountId: string,
    points: number,
  ): Promise<{ oldScore: number; newScore: number; gameLockedUntil: Date | null }> {
    const result = await this.dataSource.query<
      { old_score: number; new_score: number; game_locked_until: Date | null }[]
    >(
      `WITH prev AS (
        SELECT score AS old_score FROM trust_report.trust_scores WHERE account_id = $1
      )
      UPDATE trust_report.trust_scores
      SET score = GREATEST(0, score - $2::int),
          game_locked_until = CASE
            WHEN GREATEST(0, score - $2::int) = 0 THEN now() + interval '7 days'
            ELSE game_locked_until
          END
      WHERE account_id = $1
      RETURNING
        (SELECT old_score FROM prev) AS old_score,
        score AS new_score,
        game_locked_until`,
      [accountId, points],
    );

    if (!result.length) {
      return { oldScore: 100, newScore: Math.max(0, 100 - points), gameLockedUntil: null };
    }

    const row = result[0];
    return {
      oldScore: row.old_score,
      newScore: row.new_score,
      gameLockedUntil: row.game_locked_until,
    };
  }

  async findByAccountId(accountId: string): Promise<TrustScore | null> {
    const row = await this.repo.findOne({ where: { accountId } });
    return row ? this.toDomain(row) : null;
  }

  async initByAccountId(accountId: string): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO trust_report.trust_scores (account_id, score, game_locked_until, last_recovery_date)
       VALUES ($1, 100, NULL, NULL)
       ON CONFLICT (account_id) DO NOTHING`,
      [accountId],
    );
  }

  async dailyRecovery(accountId: string): Promise<{ newScore: number } | null> {
    const result = await this.dataSource.query<{ score: number }[]>(
      `UPDATE trust_report.trust_scores
       SET score = LEAST(100, score + 1),
           last_recovery_date = CURRENT_DATE
       WHERE account_id = $1
         AND game_locked_until IS NOT NULL
         AND game_locked_until <= now()
         AND (last_recovery_date IS NULL OR last_recovery_date < CURRENT_DATE)
       RETURNING score`,
      [accountId],
    );

    if (!result.length) return null;
    return { newScore: result[0].score };
  }

  private toDomain(row: TrustScoreOrmEntity): TrustScore {
    const entity = new TrustScore();
    entity.accountId = row.accountId;
    entity.score = row.score;
    entity.gameLockedUntil = row.gameLockedUntil;
    entity.lastRecoveryDate = row.lastRecoveryDate;
    entity.updatedAt = row.updatedAt;
    return entity;
  }
}
