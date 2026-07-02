import { ApiProperty } from '@nestjs/swagger';

export class PlayerReportTypeDto {
  @ApiProperty({ example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' })
  id: string;

  @ApiProperty({ example: 'cheating' })
  name: string;
}

export class PlayerReportTypeListDto {
  @ApiProperty({ type: [PlayerReportTypeDto] })
  items: PlayerReportTypeDto[];
}
