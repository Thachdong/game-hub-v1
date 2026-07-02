import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrustScoreResponseDto {
  @ApiProperty({ example: 80 })
  score: number;

  @ApiProperty({ example: false })
  gameLocked: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  gameLockedUntil: Date | null;

  @ApiPropertyOptional({ example: '2026-06-29', nullable: true })
  lastRecoveryDate: string | null;

  @ApiProperty({ example: '2026-06-30T10:00:00.000Z' })
  updatedAt: Date;
}
