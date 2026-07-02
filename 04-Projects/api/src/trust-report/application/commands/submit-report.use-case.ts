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
  IAccountExistencePort,
  ACCOUNT_EXISTENCE_PORT,
} from '../../domain/ports/account-existence.port';
import {
  SelfReportError,
  AccountNotFoundError,
  ReportTypeNotFoundError,
  ReportTypeInactiveError,
} from '../../domain/errors';

export interface SubmitReportCommand {
  reporterId: string;
  reportedUserId: string;
  reportTypeId: string;
  context: string;
}

@Injectable()
export class SubmitReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY_PORT)
    private readonly reportRepo: IReportRepositoryPort,
    @Inject(REPORT_TYPE_REPOSITORY_PORT)
    private readonly reportTypeRepo: IReportTypeRepositoryPort,
    @Inject(ACCOUNT_EXISTENCE_PORT)
    private readonly accountExistence: IAccountExistencePort,
  ) {}

  async execute(cmd: SubmitReportCommand): Promise<Report> {
    if (cmd.reporterId === cmd.reportedUserId) {
      throw new SelfReportError();
    }

    const exists = await this.accountExistence.exists(cmd.reportedUserId);
    if (!exists) {
      throw new AccountNotFoundError();
    }

    const reportType = await this.reportTypeRepo.findById(cmd.reportTypeId, true);
    if (!reportType) {
      throw new ReportTypeNotFoundError();
    }
    if (!reportType.active) {
      throw new ReportTypeInactiveError();
    }

    return this.reportRepo.save({
      reporterId: cmd.reporterId,
      reportedUserId: cmd.reportedUserId,
      reportTypeId: cmd.reportTypeId,
      context: cmd.context,
      status: ReportStatus.PENDING,
      appliedPoints: null,
      resolvedAt: null,
      resolvedBy: null,
    });
  }
}
