import { ApiProperty } from '@nestjs/swagger';

export class AccountInResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  avatarUrl: string;
}
