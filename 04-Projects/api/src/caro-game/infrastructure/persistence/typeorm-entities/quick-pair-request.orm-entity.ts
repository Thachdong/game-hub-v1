import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'caro_game', name: 'quick_pair_requests' })
export class QuickPairRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ name: 'config_id', type: 'uuid' })
  configId: string;

  @Column({ name: 'board_size', length: 10 })
  boardSize: string;

  @Column({ name: 'move_time_seconds', type: 'smallint' })
  moveTimeSeconds: number;

  @Column({ length: 20, default: 'waiting' })
  status: 'waiting' | 'matched' | 'cancelled';

  @Column({ name: 'match_id', type: 'uuid', nullable: true })
  matchId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
