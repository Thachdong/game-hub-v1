import { ReportType } from '../entities/report-type';

export const REPORT_TYPE_REPOSITORY_PORT = 'REPORT_TYPE_REPOSITORY_PORT';

export interface IReportTypeRepositoryPort {
  findAllActive(): Promise<ReportType[]>;
  findById(id: string, includeInactive?: boolean): Promise<ReportType | null>;
  save(data: Omit<ReportType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportType>;
  update(
    id: string,
    fields: Partial<Pick<ReportType, 'name' | 'deductionPoints' | 'active'>>,
  ): Promise<ReportType>;
  findAll(): Promise<ReportType[]>;
}
