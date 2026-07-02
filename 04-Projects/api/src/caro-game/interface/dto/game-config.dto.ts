import { ApiProperty } from '@nestjs/swagger';

export class GameConfigDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['18x18', '25x25', '40x40'] })
  boardSize: string;

  @ApiProperty({ enum: [5, 10, 15, 25, 35, 45, 60] })
  moveTimeSeconds: number;

  @ApiProperty()
  createdAt: Date;
}

export class ListGameConfigsResponseDto {
  @ApiProperty({ type: [GameConfigDto] })
  items: GameConfigDto[];
}
