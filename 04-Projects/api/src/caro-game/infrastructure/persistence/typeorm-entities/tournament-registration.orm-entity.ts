import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ schema: 'caro_game', name: 'tournament_registrations' })
@Unique('uq_caro_tournament_registration', ['tournamentId', 'playerId'])
@Index('idx_caro_treg_tournament_points', ['tournamentId', 'tournamentPoints'])
@Index('idx_caro_treg_status', ['tournamentId', 'status'])
export class TournamentRegistrationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id', type: 'uuid' })
  tournamentId: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'elo_at_registration', type: 'int' })
  eloAtRegistration: number;

  @Column({ name: 'tournament_points', type: 'int', default: 0 })
  tournamentPoints: number;

  @Column({ name: 'win_streak', type: 'int', default: 0 })
  winStreak: number;

  @Column({ type: 'varchar', length: 20, default: 'idle' })
  status: string;

  @CreateDateColumn({ name: 'registered_at', type: 'timestamptz' })
  registeredAt: Date;
}
