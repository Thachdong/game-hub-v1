import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '@common/dto/api-response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T> | T> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseDto<T> | T> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();

    if (response.statusCode === HttpStatus.NO_CONTENT) {
      return next.handle();
    }

    return next.handle().pipe(
      map(
        (data): ApiResponseDto<T> => ({
          statusCode: response.statusCode,
          data: (data ?? null) as T,
          message: 'Success',
        }),
      ),
    );
  }
}
