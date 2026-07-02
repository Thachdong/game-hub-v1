import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { SubmitReportUseCase } from '../../application/commands/submit-report.use-case';
import { SubmitReportDto, SubmitReportResponseDto } from '../dto/submit-report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly submitReport: SubmitReportUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Submit a report against another user' })
  @ApiResponse({ status: 201, description: 'Report created', type: SubmitReportResponseDto })
  @ApiResponse({ status: 400, description: 'Self-report or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account or report type not found' })
  @ApiResponse({ status: 422, description: 'Report type is inactive' })
  async submit(
    @Request() req: { user: { sub: string } },
    @Body() dto: SubmitReportDto,
  ): Promise<SubmitReportResponseDto> {
    const report = await this.submitReport.execute({
      reporterId: req.user.sub,
      reportedUserId: dto.reportedUserId,
      reportTypeId: dto.reportTypeId,
      context: dto.context,
    });

    const response = new SubmitReportResponseDto();
    response.id = report.id;
    response.reportedUserId = report.reportedUserId;
    response.reportTypeId = report.reportTypeId;
    response.context = report.context;
    response.status = report.status;
    response.submittedAt = report.submittedAt;
    return response;
  }
}
