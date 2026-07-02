import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity({ schema: 'account_social', name: 'game_admin_roles' })
@Unique(['accountId', 'gameId'])
export class GameAdminRoleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id' })
  accountId: string;

  @Column({ name: 'game_id' })
  gameId: string;

  @CreateDateColumn({ name: 'granted_at' })
  grantedAt: Date;
}
