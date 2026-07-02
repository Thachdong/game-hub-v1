import { ApiProperty } from '@nestjs/swagger';

export class GameAdminRoleRecordDto {
  @ApiProperty()
  accountId: string;

  @ApiProperty()
  gameId: string;

  @ApiProperty()
  grantedAt: Date;
}
