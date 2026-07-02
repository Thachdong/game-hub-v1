import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'caro_game', name: 'tournament_matches' })
@Index('idx_caro_tmatch_tournament_id', ['tournamentId'])
@Index('idx_caro_tmatch_match_id', ['matchId'], { unique: true })
export class TournamentMatchOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id', type: 'uuid' })
  tournamentId: string;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId: string;

  @Column({ name: 'white_registration_id', type: 'uuid' })
  whiteRegistrationId: string;

  @Column({ name: 'black_registration_id', type: 'uuid' })
  blackRegistrationId: string;

  @Column({ name: 'white_points_awarded', type: 'int', nullable: true })
  whitePointsAwarded: number | null;

  @Column({ name: 'black_points_awarded', type: 'int', nullable: true })
  blackPointsAwarded: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
