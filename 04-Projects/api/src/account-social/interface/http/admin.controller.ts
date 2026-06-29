import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@interface/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '@interface/guards/platform-admin.guard';
import { AssignGameAdminUseCase } from '@application/commands/assign-game-admin.use-case';
import { RevokeGameAdminUseCase } from '@application/commands/revoke-game-admin.use-case';
import { AssignGameAdminDto } from '@interface/dto/admin/assign-game-admin.dto';
import { GameAdminRoleRecordDto } from '@interface/dto/admin/game-admin-role-record.dto';
import {
  AccountNotFoundError,
  GameNotFoundError,
  GameAdminRoleNotFoundError,
} from '@domain/errors';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly assignGameAdmin: AssignGameAdminUseCase,
    private readonly revokeGameAdmin: RevokeGameAdminUseCase,
  ) {}

  @Post('games/:gameId/admins')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign Game Admin role' })
  @ApiResponse({ status: 201, type: GameAdminRoleRecordDto })
  @ApiResponse({ status: 403, description: 'Requires Platform Admin' })
  @ApiResponse({ status: 404, description: 'Account or game not found' })
  async assign(
    @Param('gameId') gameId: string,
    @Body() dto: AssignGameAdminDto,
  ): Promise<GameAdminRoleRecordDto> {
    try {
      const role = await this.assignGameAdmin.execute(dto.accountId, gameId);
      return { accountId: role.accountId, gameId: role.gameId, grantedAt: role.grantedAt };
    } catch (err) {
      if (err instanceof AccountNotFoundError)
        throw new HttpException({ code: err.code, message: err.message }, HttpStatus.NOT_FOUND);
      if (err instanceof GameNotFoundError)
        throw new HttpException({ code: err.code, message: err.message }, HttpStatus.NOT_FOUND);
      throw err;
    }
  }

  @Delete('games/:gameId/admins/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke Game Admin role' })
  @ApiResponse({ status: 204, description: 'Role revoked' })
  @ApiResponse({ status: 403, description: 'Requires Platform Admin' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async revoke(
    @Param('gameId') gameId: string,
    @Param('accountId') accountId: string,
  ): Promise<void> {
    try {
      await this.revokeGameAdmin.execute(accountId, gameId);
    } catch (err) {
      if (err instanceof GameAdminRoleNotFoundError)
        throw new HttpException({ code: err.code, message: err.message }, HttpStatus.NOT_FOUND);
      throw err;
    }
  }
}
