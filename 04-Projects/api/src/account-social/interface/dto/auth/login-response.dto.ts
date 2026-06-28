import { ApiProperty } from '@nestjs/swagger';
import { AccountInResponseDto } from './account-in-response.dto';

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: AccountInResponseDto })
  account: AccountInResponseDto;
}
