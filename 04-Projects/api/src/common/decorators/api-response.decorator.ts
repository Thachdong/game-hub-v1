import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto } from '@common/dto/api-response.dto';

interface ApiDataResponseOptions {
  status?: HttpStatus;
  description?: string;
  isArray?: boolean;
}

/** Documents a success response wrapped in {@link ApiResponseDto}, with `data` typed as `model`. */
export function ApiDataResponse<TModel extends Type<unknown>>(
  model: TModel,
  options: ApiDataResponseOptions = {},
) {
  const { status = HttpStatus.OK, description, isArray = false } = options;

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: isArray
                ? { type: 'array', items: { $ref: getSchemaPath(model) } }
                : { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
}

/** Documents an error response wrapped in {@link ApiResponseDto}, with `data` nulled out. */
export function ApiErrorResponse(status: HttpStatus, description: string) {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          { properties: { statusCode: { example: status }, data: { nullable: true, example: null } } },
        ],
      },
    }),
  );
}
