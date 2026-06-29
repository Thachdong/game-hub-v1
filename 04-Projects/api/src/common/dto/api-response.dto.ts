import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';

export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: HttpStatus.OK, description: 'Internal status code (mirrors HTTP status)' })
  statusCode: number;

  @ApiProperty({ type: () => Object, description: 'Response payload, shape varies per endpoint' })
  data: T;

  @ApiProperty({ example: 'Success', description: 'Human-readable message' })
  message: string;
}
