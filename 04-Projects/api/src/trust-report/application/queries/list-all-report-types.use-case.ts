import { Injectable, Inject } from '@nestjs/common';
import { ReportType } from '../../domain/entities/report-type';
import {
  IReportTypeRepositoryPort,
  REPORT_TYPE_REPOSITORY_PORT,
} from '../../domain/ports/report-type.repository.port';

@Injectable()
export class ListAllReportTypesUseCase {
  constructor(
    @Inject(REPORT_TYPE_REPOSITORY_PORT)
    private readonly reportTypeRepo: IReportTypeRepositoryPort,
  ) {}

  async execute(): Promise<ReportType[]> {
    return this.reportTypeRepo.findAll();
  }
}
