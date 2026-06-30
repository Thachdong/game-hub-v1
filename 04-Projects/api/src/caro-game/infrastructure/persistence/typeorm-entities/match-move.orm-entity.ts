import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ schema: 'caro_game', name: 'match_moves' })
@Unique('uq_caro_match_moves_cell', ['matchId', 'row', 'col'])
@Unique('uq_caro_match_moves_seq', ['matchId', 'sequenceNumber'])
@Index('idx_caro_match_moves_match', ['matchId', 'sequenceNumber'])
export class MatchMoveOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_id', type: 'uuid' })
  matchId: string;

  @Column({ name: 'player_id', type: 'uuid' })
  playerId: string;

  @Column({ type: 'smallint' })
  row: number;

  @Column({ type: 'smallint' })
  col: number;

  @Column({ name: 'sequence_number', type: 'int' })
  sequenceNumber: number;

  @Column({ name: 'placed_at', type: 'timestamptz', default: () => 'NOW()' })
  placedAt: Date;
}
