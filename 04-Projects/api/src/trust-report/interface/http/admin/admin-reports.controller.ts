import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../shared-auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../../../../shared-auth/platform-admin.guard';
import { ReportStatus } from '../../../domain/entities/report';
import { ReviewReportUseCase } from '../../../application/commands/review-report.use-case';
import { ListReportsUseCase } from '../../../application/queries/list-reports.use-case';
import {
  AdminListReportsResponseDto,
  AdminReportEntryDto,
  ConfirmReportResponseDto,
  ReviewReportDto,
} from '../../dto/admin-report.dto';

@ApiTags('Admin — Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(
    private readonly listReports: ListReportsUseCase,
    private readonly reviewReport: ReviewReportUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List reports (admin view, cursor-paginated)' })
  @ApiQuery({ name: 'status', enum: ['pending', 'valid', 'invalid'], required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursorSubmittedAt', required: false, type: String })
  @ApiQuery({ name: 'cursorId', required: false, type: String })
  @ApiResponse({ status: 200, type: AdminListReportsResponseDto })
  @ApiResponse({ status: 400, description: 'Partial cursor provided' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a Platform Admin' })
  async list(
    @Query('status') statusParam: string = 'pending',
    @Query('limit') limitParam?: string,
    @Query('cursorSubmittedAt') cursorSubmittedAt?: string,
    @Query('cursorId') cursorId?: string,
  ): Promise<AdminListReportsResponseDto> {
    const hasCursorAt = !!cursorSubmittedAt;
    const hasCursorId = !!cursorId;
    if (hasCursorAt !== hasCursorId) {
      throw new BadRequestException(
        'cursorSubmittedAt and cursorId must be provided together or not at all.',
      );
    }

    const status =
      statusParam === 'valid'
        ? ReportStatus.VALID
        : statusParam === 'invalid'
          ? ReportStatus.INVALID
          : ReportStatus.PENDING;

    const limit = Math.min(50, Math.max(1, parseInt(limitParam ?? '20', 10) || 20));
    const cursor =
      cursorSubmittedAt && cursorId
        ? { submittedAt: new Date(cursorSubmittedAt), id: cursorId }
        : undefined;

    const { items, nextCursor } = await this.listReports.execute({ status, cursor, limit });

    return {
      items: items.map(
        (r): AdminReportEntryDto => ({
          id: r.id,
          reporterId: r.reporterId,
          reportedUserId: r.reportedUserId,
          reportTypeId: r.reportTypeId,
          context: r.context,
          status: r.status,
          appliedPoints: r.appliedPoints,
          submittedAt: r.submittedAt,
          resolvedAt: r.resolvedAt,
          resolvedBy: r.resolvedBy,
        }),
      ),
      nextCursor: nextCursor
        ? { submittedAt: nextCursor.submittedAt.toISOString(), id: nextCursor.id }
        : null,
    };
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a pending report as valid or invalid' })
  @ApiResponse({ status: 200, type: ConfirmReportResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a Platform Admin' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({ status: 409, description: 'Report already resolved' })
  async confirm(
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
    @Request() req: { user: { sub: string } },
  ): Promise<ConfirmReportResponseDto> {
    const { report, trustScoreSnapshot } = await this.reviewReport.execute({
      reportId: id,
      decision: dto.decision,
      adminId: req.user.sub,
    });

    return {
      id: report.id,
      status: report.status,
      appliedPoints: report.appliedPoints,
      resolvedAt: report.resolvedAt!,
      resolvedBy: report.resolvedBy!,
      ...(trustScoreSnapshot ? { reportedUserTrustScore: trustScoreSnapshot } : {}),
    };
  }
}
