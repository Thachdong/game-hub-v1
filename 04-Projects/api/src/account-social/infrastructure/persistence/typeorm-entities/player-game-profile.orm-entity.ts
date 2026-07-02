import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity({ schema: 'account_social', name: 'player_game_profiles' })
@Unique(['accountId', 'gameId'])
export class PlayerGameProfileOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id' })
  accountId: string;

  @Column({ name: 'game_id' })
  gameId: string;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;
}
