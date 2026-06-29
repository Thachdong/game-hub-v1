import { ApiProperty } from '@nestjs/swagger';

export class NotificationEntryDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({
    example: 'friend-or-game-invite',
    enum: ['friend-or-game-invite', 'tournament-event', 'admin-warning', 'trust-score-alert'],
  })
  type: string;

  @ApiProperty({ example: 'Alice sent you a friend request.' })
  content: string;

  @ApiProperty({ example: null, nullable: true })
  referenceId: string | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2026-06-29T10:00:00.000Z' })
  createdAt: string;
}
