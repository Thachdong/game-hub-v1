import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class QuickPairRequestDto {
  @ApiProperty({ description: 'Active game configuration UUID' })
  @IsUUID()
  configId: string;
}

export class QuickPairResponseDto {
  @ApiProperty({ enum: ['waiting', 'matched'] }) status: 'waiting' | 'matched';
  @ApiProperty({ nullable: true }) requestId: string | null;
  @ApiProperty({ nullable: true }) matchId: string | null;
}
