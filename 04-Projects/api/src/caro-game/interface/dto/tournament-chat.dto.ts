import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendTournamentChatDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}

export class TournamentChatMessageResponseDto {
  @ApiProperty()
  messageId: string;

  @ApiProperty()
  senderPlayerId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  sentAt: Date;
}
