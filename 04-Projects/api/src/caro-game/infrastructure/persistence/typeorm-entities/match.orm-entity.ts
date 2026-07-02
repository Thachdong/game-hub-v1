import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'caro_game', name: 'matches' })
@Index('idx_caro_matches_status', ['status'])
@Index('idx_caro_matches_creator', ['creatorId'])
@Index('idx_caro_matches_players', ['playerXId', 'playerOId'])
export class MatchOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'config_id', type: 'uuid' })
  configId: string;

  @Column({ name: 'board_size', type: 'varchar', length: 10 })
  boardSize: string;

  @Column({ name: 'move_time_seconds', type: 'smallint' })
  moveTimeSeconds: number;

  @Column({ type: 'varchar', length: 10 })
  visibility: string;

  @Column({ type: 'varchar', length: 30, default: 'looking_for_opponent' })
  status: string;

  @Column({ name: 'creator_id', type: 'uuid' })
  creatorId: string;

  @Column({ name: 'second_player_id', type: 'uuid', nullable: true })
  secondPlayerId: string | null;

  @Column({ name: 'player_x_id', type: 'uuid', nullable: true })
  playerXId: string | null;

  @Column({ name: 'player_o_id', type: 'uuid', nullable: true })
  playerOId: string | null;

  @Column({ name: 'current_turn_player_id', type: 'uuid', nullable: true })
  currentTurnPlayerId: string | null;

  @Column({ name: 'pending_draw_request_from_id', type: 'uuid', nullable: true })
  pendingDrawRequestFromId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  result: string | null;

  @Column({ name: 'winner_player_id', type: 'uuid', nullable: true })
  winnerPlayerId: string | null;

  @Column({ name: 'player_x_elo_change', type: 'smallint', nullable: true })
  playerXEloChange: number | null;

  @Column({ name: 'player_o_elo_change', type: 'smallint', nullable: true })
  playerOEloChange: number | null;

  @Column({ name: 'deadline_at', type: 'timestamptz', nullable: true })
  deadlineAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'tournament_id', type: 'uuid', nullable: true })
  tournamentId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
