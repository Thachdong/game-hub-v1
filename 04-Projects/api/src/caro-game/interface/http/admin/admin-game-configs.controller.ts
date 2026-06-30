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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiResponse({ status: 201, description: 'Created', type: AdminGameConfigDto })
  @ApiResponse({ status: 400, description: 'Invalid enum value' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a Caro Game Admin' })
  @ApiResponse({ status: 409, description: 'Duplicate active config' })
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
  @ApiOperation({ summary: 'List all game configurations (including inactive)' })
  @ApiResponse({ status: 200, description: 'All configs', type: AdminListGameConfigsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listAll(): Promise<AdminListGameConfigsResponseDto> {
    const configs = await this.listAllUseCase.execute();
    return { items: configs.map(this.toDto) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing game configuration' })
  @ApiResponse({ status: 200, description: 'Updated config', type: AdminGameConfigDto })
  @ApiResponse({ status: 400, description: 'Invalid enum value or empty body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  @ApiResponse({ status: 409, description: 'Duplicate active config' })
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
  @ApiResponse({ status: 204, description: 'Deactivated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  async deactivate(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    await this.deactivateUseCase.execute({ id, actorId: req.user.sub });
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate a previously deactivated game configuration' })
  @ApiResponse({ status: 200, description: 'Reactivated config', type: AdminGameConfigDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  @ApiResponse({ status: 409, description: 'Duplicate active config' })
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
