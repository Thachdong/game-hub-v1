import { ApiProperty } from '@nestjs/swagger';
import { NotificationEntryDto } from './notification-entry.dto';

class NextCursorDto {
  @ApiProperty({ example: '2026-06-29T09:59:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '4ab85f64-5717-4562-b3fc-2c963f66afa7' })
  id: string;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationEntryDto] })
  items: NotificationEntryDto[];

  @ApiProperty({ type: NextCursorDto, nullable: true })
  nextCursor: { createdAt: string; id: string } | null;
}
