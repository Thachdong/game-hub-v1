import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GameEntryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  hasProfile?: boolean;
}
