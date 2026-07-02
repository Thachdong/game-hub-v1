import { Injectable, Inject } from '@nestjs/common';
import { ReportType } from '../../domain/entities/report-type';
import {
  IReportTypeRepositoryPort,
  REPORT_TYPE_REPOSITORY_PORT,
} from '../../domain/ports/report-type.repository.port';
import { InvalidDeductionPointsError } from '../../domain/errors';

export interface CreateReportTypeCommand {
  name: string;
  deductionPoints: number;
}

@Injectable()
export class CreateReportTypeUseCase {
  constructor(
    @Inject(REPORT_TYPE_REPOSITORY_PORT)
    private readonly reportTypeRepo: IReportTypeRepositoryPort,
  ) {}

  async execute(cmd: CreateReportTypeCommand): Promise<ReportType> {
    if (cmd.deductionPoints < 1 || cmd.deductionPoints > 100) {
      throw new InvalidDeductionPointsError();
    }
    return this.reportTypeRepo.save({
      name: cmd.name,
      deductionPoints: cmd.deductionPoints,
      active: true,
    });
  }
}
