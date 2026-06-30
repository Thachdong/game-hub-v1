import { Report, ReportStatus } from '../entities/report';

export const REPORT_REPOSITORY_PORT = 'REPORT_REPOSITORY_PORT';

export interface IReportRepositoryPort {
  save(report: Omit<Report, 'id' | 'submittedAt'>): Promise<Report>;
  findById(id: string): Promise<Report | null>;
  findByStatusPaginated(
    status: ReportStatus,
    cursor: { submittedAt: Date; id: string } | undefined,
    limit: number,
  ): Promise<Report[]>;
  update(
    id: string,
    fields: Partial<Pick<Report, 'status' | 'appliedPoints' | 'resolvedAt' | 'resolvedBy'>>,
  ): Promise<Report>;
}
