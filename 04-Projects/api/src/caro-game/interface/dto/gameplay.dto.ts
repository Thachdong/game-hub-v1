import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';

export class PlaceMoveDto {
  @ApiProperty({ description: 'Row index (0-based)' })
  @IsInt()
  @Min(0)
  row: number;

  @ApiProperty({ description: 'Column index (0-based)' })
  @IsInt()
  @Min(0)
  col: number;
}

export class RespondDrawDto {
  @ApiProperty({ enum: ['accept', 'decline'] })
  @IsIn(['accept', 'decline'])
  action: 'accept' | 'decline';
}

export class PlaceMoveResponseDto {
  @ApiProperty() playerId: string;
  @ApiProperty() row: number;
  @ApiProperty() col: number;
  @ApiProperty() sequenceNumber: number;
  @ApiProperty() placedAt: Date;
  @ApiProperty() isGameOver: boolean;
  @ApiProperty({ nullable: true }) result: string | null;
  @ApiProperty({ nullable: true }) winnerPlayerId: string | null;
}
