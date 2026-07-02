import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse, ApiErrorResponse } from '@common/decorators/api-response.decorator';
import { JwtAuthGuard } from '../../../../shared-auth/jwt-auth.guard';
import { GameAdminCaroGuard } from '../../guards/game-admin-caro.guard';
import {
  AdminGameConfigDto,
  AdminListGameConfigsResponseDto,
  CreateGameConfigDto,
  UpdateGameConfigDto,
} from '../../dto/admin-game-config.dto';
import { CreateGameConfigUseCase } from '../../../application/commands/create-game-config.use-case';
import { ListAllGameConfigsUseCase } from '../../../application/queries/list-all-game-configs.use-case';
import { UpdateGameConfigUseCase } from '../../../application/commands/update-game-config.use-case';
import { DeactivateGameConfigUseCase } from '../../../application/commands/deactivate-game-config.use-case';
import { ReactivateGameConfigUseCase } from '../../../application/commands/reactivate-game-config.use-case';
import { GameConfig } from '../../../domain/entities/game-config';

@ApiTags('Admin — Caro Game Configs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, GameAdminCaroGuard)
@Controller('admin/caro/game-configs')
export class AdminGameConfigsController {
  constructor(
    private readonly createUseCase: CreateGameConfigUseCase,
    private readonly listAllUseCase: ListAllGameConfigsUseCase,
    private readonly updateUseCase: UpdateGameConfigUseCase,
    private readonly deactivateUseCase: DeactivateGameConfigUseCase,
    private readonly reactivateUseCase: ReactivateGameConfigUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new game configuration' })
  @ApiDataResponse(AdminGameConfigDto, { status: HttpStatus.CREATED, description: 'Config created' })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Invalid board size or move time')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Missing or expired JWT')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not a Caro Game Admin')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Active config with this combo already exists')
  async create(
    @Body() dto: CreateGameConfigDto,
    @Request() req: { user: { sub: string } },
  ): Promise<AdminGameConfigDto> {
    const config = await this.createUseCase.execute({
      boardSize: dto.boardSize,
      moveTimeSeconds: dto.moveTimeSeconds,
      actorId: req.user.sub,
    });
    return this.toDto(config);
  }

  @Get()
  @ApiOperation({ summary: 'List all game configurations including inactive' })
  @ApiDataResponse(AdminListGameConfigsResponseDto, { description: 'All configs' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Missing or expired JWT')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not a Caro Game Admin')
  async listAll(): Promise<AdminListGameConfigsResponseDto> {
    const configs = await this.listAllUseCase.execute();
    return { items: configs.map(this.toDto) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update board size and/or move time of a configuration' })
  @ApiDataResponse(AdminGameConfigDto, { description: 'Updated config' })
  @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Invalid enum value or empty body')
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Missing or expired JWT')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not a Caro Game Admin')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Config not found')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Active config with this combo already exists')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGameConfigDto,
  ): Promise<AdminGameConfigDto> {
    const config = await this.updateUseCase.execute({ id, ...dto });
    return this.toDto(config);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate (soft-delete) a game configuration' })
  @ApiResponse({ status: 204, description: 'Deactivated — no content' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Missing or expired JWT')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not a Caro Game Admin')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Config not found')
  async deactivate(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    await this.deactivateUseCase.execute({ id, actorId: req.user.sub });
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate a previously deactivated configuration' })
  @ApiDataResponse(AdminGameConfigDto, { description: 'Reactivated config' })
  @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Missing or expired JWT')
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not a Caro Game Admin')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Config not found')
  @ApiErrorResponse(HttpStatus.CONFLICT, 'Active config with same combo already exists')
  async reactivate(@Param('id') id: string): Promise<AdminGameConfigDto> {
    const config = await this.reactivateUseCase.execute({ id });
    return this.toDto(config);
  }

  private toDto(config: GameConfig): AdminGameConfigDto {
    const dto = new AdminGameConfigDto();
    dto.id = config.id;
    dto.boardSize = config.boardSize;
    dto.moveTimeSeconds = config.moveTimeSeconds;
    dto.active = config.active;
    dto.createdBy = config.createdBy;
    dto.createdAt = config.createdAt;
    dto.updatedAt = config.updatedAt;
    dto.deactivatedBy = config.deactivatedBy;
    dto.deactivatedAt = config.deactivatedAt;
    return dto;
  }
}
