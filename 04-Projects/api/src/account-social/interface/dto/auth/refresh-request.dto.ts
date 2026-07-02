import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class RefreshRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  refreshToken: string;
}
