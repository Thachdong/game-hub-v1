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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../shared-auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../../../../shared-auth/platform-admin.guard';
import { CreateReportTypeUseCase } from '../../../application/commands/create-report-type.use-case';
import { UpdateReportTypeUseCase } from '../../../application/commands/update-report-type.use-case';
import { DeactivateReportTypeUseCase } from '../../../application/commands/deactivate-report-type.use-case';
import { ListAllReportTypesUseCase } from '../../../application/queries/list-all-report-types.use-case';
import {
  AdminListReportTypesResponseDto,
  AdminReportTypeEntryDto,
  CreateReportTypeDto,
  UpdateReportTypeDto,
} from '../../dto/admin-report-type.dto';

@ApiTags('Admin — Report Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/report-types')
export class AdminReportTypesController {
  constructor(
    private readonly listAll: ListAllReportTypesUseCase,
    private readonly createType: CreateReportTypeUseCase,
    private readonly updateType: UpdateReportTypeUseCase,
    private readonly deactivateType: DeactivateReportTypeUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all report types including inactive (admin view)' })
  @ApiResponse({ status: 200, type: AdminListReportTypesResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a Platform Admin' })
  async list(): Promise<AdminListReportTypesResponseDto> {
    const types = await this.listAll.execute();
    return {
      items: types.map(
        (t): AdminReportTypeEntryDto => ({
          id: t.id,
          name: t.name,
          deductionPoints: t.deductionPoints,
          active: t.active,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }),
      ),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new report type' })
  @ApiResponse({ status: 201, type: AdminReportTypeEntryDto })
  @ApiResponse({ status: 400, description: 'Invalid deduction points' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a Platform Admin' })
  @ApiResponse({ status: 409, description: 'Name already taken' })
  async create(@Body() dto: CreateReportTypeDto): Promise<AdminReportTypeEntryDto> {
    const type = await this.createType.execute({
      name: dto.name,
      deductionPoints: dto.deductionPoints,
    });
    return {
      id: type.id,
      name: type.name,
      deductionPoints: type.deductionPoints,
      active: type.active,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a report type (name, deductionPoints, active)' })
  @ApiResponse({ status: 200, type: AdminReportTypeEntryDto })
  @ApiResponse({ status: 400, description: 'Empty update or invalid points' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a Platform Admin' })
  @ApiResponse({ status: 404, description: 'Report type not found' })
  @ApiResponse({ status: 409, description: 'Name already taken' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReportTypeDto,
  ): Promise<AdminReportTypeEntryDto> {
    const type = await this.updateType.execute({ id, ...dto });
    return {
      id: type.id,
      name: type.name,
      deductionPoints: type.deductionPoints,
      active: type.active,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a report type (idempotent soft-delete)' })
  @ApiResponse({ status: 204, description: 'Deactivated or already inactive' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a Platform Admin' })
  @ApiResponse({ status: 404, description: 'Report type not found' })
  async deactivate(@Param('id') id: string): Promise<void> {
    await this.deactivateType.execute(id);
  }
}
