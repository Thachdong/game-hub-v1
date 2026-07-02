import { Injectable, Inject } from '@nestjs/common';
import {
  IReportTypeRepositoryPort,
  REPORT_TYPE_REPOSITORY_PORT,
} from '../../domain/ports/report-type.repository.port';
import { ReportTypeNotFoundError } from '../../domain/errors';

@Injectable()
export class DeactivateReportTypeUseCase {
  constructor(
    @Inject(REPORT_TYPE_REPOSITORY_PORT)
    private readonly reportTypeRepo: IReportTypeRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const reportType = await this.reportTypeRepo.findById(id, true);
    if (!reportType) throw new ReportTypeNotFoundError();
    if (!reportType.active) return; // idempotent
    await this.reportTypeRepo.update(id, { active: false });
  }
}
