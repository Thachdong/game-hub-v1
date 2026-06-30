import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, MinLength, MaxLength } from 'class-validator';

export class SubmitReportDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID()
  reportedUserId: string;

  @ApiProperty({ example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' })
  @IsUUID()
  reportTypeId: string;

  @ApiProperty({ example: 'Used an aim-assist tool during ranked match #4821.', minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  context: string;
}

export class SubmitReportResponseDto {
  @ApiProperty({ example: '5e2c1a0e-2f1e-4d3b-9a8b-1c2d3e4f5a6b' })
  id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  reportedUserId: string;

  @ApiProperty({ example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' })
  reportTypeId: string;

  @ApiProperty({ example: 'Used an aim-assist tool during ranked match #4821.' })
  context: string;

  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty({ example: '2026-06-30T10:00:00.000Z' })
  submittedAt: Date;
}
