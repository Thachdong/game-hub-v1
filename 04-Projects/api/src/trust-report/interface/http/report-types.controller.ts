import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { ListReportTypesUseCase } from '../../application/queries/list-report-types.use-case';
import { PlayerReportTypeListDto, PlayerReportTypeDto } from '../dto/report-type.dto';

@ApiTags('Report Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('report-types')
export class ReportTypesController {
  constructor(private readonly listReportTypes: ListReportTypesUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List active report types available for submission' })
  @ApiResponse({ status: 200, description: 'Active report types', type: PlayerReportTypeListDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async list(): Promise<{ items: PlayerReportTypeDto[] }> {
    const items = await this.listReportTypes.execute();
    return { items };
  }
}
