import { IsOptional, IsInt, Min, Max, IsISO8601, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;

  @ApiPropertyOptional({ example: '2026-06-29T09:59:00.000Z' })
  @IsOptional()
  @IsISO8601()
  cursorCreatedAt?: string;

  @ApiPropertyOptional({ example: '4ab85f64-5717-4562-b3fc-2c963f66afa7' })
  @IsOptional()
  @IsUUID()
  cursorId?: string;
}
