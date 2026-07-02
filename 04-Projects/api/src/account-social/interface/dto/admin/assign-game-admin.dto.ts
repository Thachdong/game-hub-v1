import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignGameAdminDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId: string;
}
