import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PlayerProfileResponseDto {
  @ApiProperty() playerId: string;
  @ApiProperty() elo: number;
  @ApiProperty() matchesPlayed: number;
  @ApiProperty() wins: number;
  @ApiProperty() losses: number;
  @ApiProperty() draws: number;
  @ApiProperty() winRate: number;
  @ApiProperty() createdAt: Date;
}

export class MatchHistoryItemDto {
  @ApiProperty() id: string;
  @ApiProperty() boardSize: string;
  @ApiProperty() moveTimeSeconds: number;
  @ApiProperty() result: string | null;
  @ApiProperty({ nullable: true }) winnerPlayerId: string | null;
  @ApiProperty({ nullable: true }) playerXEloChange: number | null;
  @ApiProperty({ nullable: true }) playerOEloChange: number | null;
  @ApiProperty({ nullable: true }) startedAt: Date | null;
  @ApiProperty({ nullable: true }) endedAt: Date | null;
}

export class MatchHistoryResponseDto {
  @ApiProperty({ type: [MatchHistoryItemDto] }) items: MatchHistoryItemDto[];
  @ApiPropertyOptional({ nullable: true }) nextCursor: string | null;
}

export class MatchHistoryQueryDto {
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;
}
