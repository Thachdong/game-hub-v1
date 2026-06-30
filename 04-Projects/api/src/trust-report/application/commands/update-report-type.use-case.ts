import { Injectable, Inject } from '@nestjs/common';
import { ReportType } from '../../domain/entities/report-type';
import {
  IReportTypeRepositoryPort,
  REPORT_TYPE_REPOSITORY_PORT,
} from '../../domain/ports/report-type.repository.port';
import { EmptyUpdateError, InvalidDeductionPointsError } from '../../domain/errors';

export interface UpdateReportTypeCommand {
  id: string;
  name?: string;
  deductionPoints?: number;
  active?: boolean;
}

@Injectable()
export class UpdateReportTypeUseCase {
  constructor(
    @Inject(REPORT_TYPE_REPOSITORY_PORT)
    private readonly reportTypeRepo: IReportTypeRepositoryPort,
  ) {}

  async execute(cmd: UpdateReportTypeCommand): Promise<ReportType> {
    const { id, ...fields } = cmd;
    if (Object.keys(fields).length === 0) {
      throw new EmptyUpdateError();
    }
    if (fields.deductionPoints !== undefined) {
      if (fields.deductionPoints < 1 || fields.deductionPoints > 100) {
        throw new InvalidDeductionPointsError();
      }
    }
    return this.reportTypeRepo.update(id, fields);
  }
}
