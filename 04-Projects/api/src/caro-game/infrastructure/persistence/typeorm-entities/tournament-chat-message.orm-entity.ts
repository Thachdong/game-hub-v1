import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'caro_game', name: 'tournament_chat_messages' })
@Index('idx_caro_tchat_tournament_sent_at', ['tournamentId', 'sentAt'])
export class TournamentChatMessageOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournament_id', type: 'uuid' })
  tournamentId: string;

  @Column({ name: 'sender_player_id', type: 'uuid' })
  senderPlayerId: string;

  @Column({ type: 'varchar', length: 500 })
  content: string;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;
}
