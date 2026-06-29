import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FriendRequestRecordDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  receiverId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true })
  resolvedAt: Date | null;
}
