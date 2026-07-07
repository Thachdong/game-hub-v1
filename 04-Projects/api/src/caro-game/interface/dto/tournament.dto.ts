import { IsUUID, IsInt, Min, IsDateString, IsOptional, IsEnum, IsNumber, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTournamentDto {
  @ApiProperty()
  @IsUUID()
  gameConfigId: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  minElo: number;

  @ApiProperty()
  @IsDateString()
  startAt: string;

  @ApiProperty()
  @IsDateString()
  endAt: string;
}

export class ListTournamentsQueryDto {
  @ApiProperty({ required: false, enum: ['waiting', 'in_progress', 'ended', 'cancelled'] })
  @IsOptional()
  @IsEnum(['waiting', 'in_progress', 'ended', 'cancelled'])
  status?: 'waiting' | 'in_progress' | 'ended' | 'cancelled';

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  cursor?: string;
}

export class TournamentSummaryDto {
  @ApiProperty()
  tournamentId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startAt: Date;

  @ApiProperty()
  endAt: Date;

  @ApiProperty()
  minElo: number;

  @ApiProperty()
  registrantCount: number;

  @ApiProperty()
  createdAt: Date;
}

export class TournamentDetailsDto extends TournamentSummaryDto {
  @ApiProperty({ nullable: true })
  gameConfig: { id: string; name?: string; timeLimitSeconds?: number } | null;
}

export class ListParticipantsQueryDto {
  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  pageSize?: number;
}
