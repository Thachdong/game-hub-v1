import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendChatDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}

export class MuteViewerDto {
  @ApiProperty({ description: 'UUID of the viewer to mute' })
  @IsUUID()
  viewerId: string;
}

export class ChatMessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() matchId: string;
  @ApiProperty() senderId: string;
  @ApiProperty() content: string;
  @ApiProperty() sentAt: Date;
}
