import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class AdminReportTypeEntryDto {
  @ApiProperty({ example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' })
  id: string;

  @ApiProperty({ example: 'cheating' })
  name: string;

  @ApiProperty({ example: 20 })
  deductionPoints: number;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-30T10:00:00.000Z' })
  updatedAt: Date;
}

export class AdminListReportTypesResponseDto {
  @ApiProperty({ type: [AdminReportTypeEntryDto] })
  items: AdminReportTypeEntryDto[];
}

export class CreateReportTypeDto {
  @ApiProperty({ example: 'griefing', minLength: 1 })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 15, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  deductionPoints: number;
}

export class UpdateReportTypeDto {
  @ApiPropertyOptional({ example: 'griefing-v2' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 15, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  deductionPoints?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
