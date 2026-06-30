import { Injectable, Inject } from '@nestjs/common';
import { Report, ReportStatus } from '../../domain/entities/report';
import {
  IReportRepositoryPort,
  REPORT_REPOSITORY_PORT,
} from '../../domain/ports/report.repository.port';
import {
  IReportTypeRepositoryPort,
  REPORT_TYPE_REPOSITORY_PORT,
} from '../../domain/ports/report-type.repository.port';
import {
  ITrustScoreRepositoryPort,
  TRUST_SCORE_REPOSITORY_PORT,
} from '../../domain/ports/trust-score.repository.port';
import {
  IEventPublisherPort,
  EVENT_PUBLISHER_PORT,
} from '../../domain/ports/event-publisher.port';
import { ReportNotFoundError, ReportAlreadyResolvedError } from '../../domain/errors';

export interface ReviewReportCommand {
  reportId: string;
  decision: 'valid' | 'invalid';
  adminId: string;
}

export interface ReviewReportResult {
  report: Report;
  trustScoreSnapshot?: { score: number; locked: boolean; lockedUntil: Date | null };
}

const THRESHOLD_LEVELS = [50, 20, 10] as const;

@Injectable()
export class ReviewReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY_PORT)
    private readonly reportRepo: IReportRepositoryPort,
    @Inject(REPORT_TYPE_REPOSITORY_PORT)
    private readonly reportTypeRepo: IReportTypeRepositoryPort,
    @Inject(TRUST_SCORE_REPOSITORY_PORT)
    private readonly trustScoreRepo: ITrustScoreRepositoryPort,
    @Inject(EVENT_PUBLISHER_PORT)
    private readonly eventPublisher: IEventPublisherPort,
  ) {}

  async execute(cmd: ReviewReportCommand): Promise<ReviewReportResult> {
    const report = await this.reportRepo.findById(cmd.reportId);
    if (!report) throw new ReportNotFoundError();
    if (report.status !== ReportStatus.PENDING) throw new ReportAlreadyResolvedError();

    const now = new Date();

    if (cmd.decision === 'valid') {
      const reportType = await this.reportTypeRepo.findById(report.reportTypeId, true);
      const deductionPoints = reportType?.deductionPoints ?? 0;

      const updated = await this.reportRepo.update(cmd.reportId, {
        status: ReportStatus.VALID,
        appliedPoints: deductionPoints,
        resolvedAt: now,
        resolvedBy: cmd.adminId,
      });

      const { oldScore, newScore, gameLockedUntil } = await this.trustScoreRepo.applyDeduction(
        report.reportedUserId,
        deductionPoints,
      );

      for (const threshold of THRESHOLD_LEVELS) {
        if (oldScore >= threshold && newScore < threshold) {
          await this.eventPublisher.publishTrustScoreAlert(
            report.reportedUserId,
            `Your trust score dropped below ${threshold}.`,
            cmd.reportId,
          );
        }
      }

      if (newScore === 0) {
        await this.eventPublisher.publishTrustScoreAlert(
          report.reportedUserId,
          'Your account is locked from game participation for 7 days.',
          cmd.reportId,
        );
      }

      const locked = gameLockedUntil !== null && gameLockedUntil > new Date();
      return {
        report: updated,
        trustScoreSnapshot: { score: newScore, locked, lockedUntil: gameLockedUntil },
      };
    }

    const updated = await this.reportRepo.update(cmd.reportId, {
      status: ReportStatus.INVALID,
      appliedPoints: null,
      resolvedAt: now,
      resolvedBy: cmd.adminId,
    });

    return { report: updated };
  }
}
