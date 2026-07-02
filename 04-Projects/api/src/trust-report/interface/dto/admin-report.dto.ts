import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class AdminReportEntryDto {
  @ApiProperty({ example: '5e2c1a0e-2f1e-4d3b-9a8b-1c2d3e4f5a6b' })
  id: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  reporterId: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  reportedUserId: string;

  @ApiProperty({ example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' })
  reportTypeId: string;

  @ApiProperty({ example: 'Used an aim-assist tool during ranked match #4821.' })
  context: string;

  @ApiProperty({ example: 'pending', enum: ['pending', 'valid', 'invalid'] })
  status: string;

  @ApiPropertyOptional({ example: 20, nullable: true })
  appliedPoints: number | null;

  @ApiProperty({ example: '2026-06-30T10:00:00.000Z' })
  submittedAt: Date;

  @ApiPropertyOptional({ example: '2026-06-30T11:00:00.000Z', nullable: true })
  resolvedAt: Date | null;

  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222', nullable: true })
  resolvedBy: string | null;
}

export class TrustScoreSnapshotDto {
  @ApiProperty({ example: 45 })
  score: number;

  @ApiProperty({ example: false })
  locked: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  lockedUntil: Date | null;
}

export class AdminListReportsResponseDto {
  @ApiProperty({ type: [AdminReportEntryDto] })
  items: AdminReportEntryDto[];

  @ApiPropertyOptional({ nullable: true })
  nextCursor: { submittedAt: string; id: string } | null;
}

export class ReviewReportDto {
  @ApiProperty({ enum: ['valid', 'invalid'], example: 'valid' })
  @IsIn(['valid', 'invalid'])
  decision: 'valid' | 'invalid';
}

export class ConfirmReportResponseDto {
  @ApiProperty({ example: '5e2c1a0e-2f1e-4d3b-9a8b-1c2d3e4f5a6b' })
  id: string;

  @ApiProperty({ enum: ['valid', 'invalid'] })
  status: string;

  @ApiPropertyOptional({ example: 20, nullable: true })
  appliedPoints: number | null;

  @ApiProperty({ example: '2026-06-30T11:00:00.000Z' })
  resolvedAt: Date;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  resolvedBy: string;

  @ApiPropertyOptional({ type: TrustScoreSnapshotDto, nullable: true })
  reportedUserTrustScore?: TrustScoreSnapshotDto;
}
