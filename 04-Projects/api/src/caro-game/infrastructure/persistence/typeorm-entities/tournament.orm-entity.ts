import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'caro_game', name: 'tournaments' })
@Index('idx_caro_tournaments_status_start_at', ['status', 'startAt'])
@Index('idx_caro_tournaments_status_end_at', ['status', 'endAt'])
export class TournamentOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_player_id', type: 'uuid' })
  creatorPlayerId: string;

  @Column({ name: 'game_config_id', type: 'uuid' })
  gameConfigId: string;

  @Column({ name: 'min_elo', type: 'int', default: 0 })
  minElo: number;

  @Column({ type: 'varchar', length: 20, default: 'waiting' })
  status: string;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
