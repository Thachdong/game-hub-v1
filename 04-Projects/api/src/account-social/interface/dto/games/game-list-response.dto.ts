import { ApiProperty } from '@nestjs/swagger';
import { GameEntryDto } from './game-entry.dto';

export class GameListResponseDto {
  @ApiProperty({ type: [GameEntryDto] })
  games: GameEntryDto[];
}
