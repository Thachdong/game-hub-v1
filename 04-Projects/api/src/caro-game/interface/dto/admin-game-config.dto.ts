import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

const BOARD_SIZES = ['18x18', '25x25', '40x40'] as const;
const MOVE_TIMES = [5, 10, 15, 25, 35, 45, 60] as const;

export class CreateGameConfigDto {
  @ApiProperty({ enum: BOARD_SIZES, example: '25x25' })
  @IsIn(BOARD_SIZES)
  boardSize: string;

  @ApiProperty({ enum: MOVE_TIMES, example: 15 })
  @IsIn(MOVE_TIMES)
  moveTimeSeconds: number;
}

export class UpdateGameConfigDto {
  @ApiProperty({ enum: BOARD_SIZES, required: false })
  @IsOptional()
  @IsIn(BOARD_SIZES)
  boardSize?: string;

  @ApiProperty({ enum: MOVE_TIMES, required: false })
  @IsOptional()
  @IsIn(MOVE_TIMES)
  moveTimeSeconds?: number;
}

export class AdminGameConfigDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: BOARD_SIZES })
  boardSize: string;

  @ApiProperty({ enum: MOVE_TIMES })
  moveTimeSeconds: number;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  deactivatedBy: string | null;

  @ApiProperty({ nullable: true })
  deactivatedAt: Date | null;
}

export class AdminListGameConfigsResponseDto {
  @ApiProperty({ type: [AdminGameConfigDto] })
  items: AdminGameConfigDto[];
}
