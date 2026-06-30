import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ schema: 'trust_report', name: 'trust_scores' })
export class TrustScoreOrmEntity {
  @PrimaryColumn({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @Column({ type: 'int', default: 100 })
  score: number;

  @Column({ name: 'game_locked_until', type: 'timestamptz', nullable: true })
  gameLockedUntil: Date | null;

  @Column({ name: 'last_recovery_date', type: 'date', nullable: true })
  lastRecoveryDate: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
