import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewRequestDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';
}

export class TournamentCreatorRequestResponseDto {
  @ApiProperty()
  requestId: string;

  @ApiProperty()
  playerId: string;

  @ApiProperty({ required: false })
  playerUsername?: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  reviewedAt?: Date | null;
}

export class RevokeResponseDto {
  @ApiProperty()
  playerId: string;

  @ApiProperty()
  revokedAt: Date;
}
