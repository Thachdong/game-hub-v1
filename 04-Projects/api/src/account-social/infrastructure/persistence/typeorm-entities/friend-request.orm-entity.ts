import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { FriendRequestStatus } from '../../../domain/entities/friend-request';

@Entity({ schema: 'account_social', name: 'friend_requests' })
@Unique(['senderId', 'receiverId'])
export class FriendRequestOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id' })
  senderId: string;

  @Column({ name: 'receiver_id' })
  receiverId: string;

  @Column({
    type: 'enum',
    enum: FriendRequestStatus,
    default: FriendRequestStatus.PENDING,
  })
  status: FriendRequestStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
