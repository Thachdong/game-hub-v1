import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity({ schema: 'account_social', name: 'friendships' })
@Unique(['accountId1', 'accountId2'])
export class FriendshipOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id_1' })
  accountId1: string;

  @Column({ name: 'account_id_2' })
  accountId2: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
