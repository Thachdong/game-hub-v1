import { Injectable, Inject } from '@nestjs/common';
import {
  IReportTypeRepositoryPort,
  REPORT_TYPE_REPOSITORY_PORT,
} from '../../domain/ports/report-type.repository.port';

export interface PlayerReportTypeItem {
  id: string;
  name: string;
}

@Injectable()
export class ListReportTypesUseCase {
  constructor(
    @Inject(REPORT_TYPE_REPOSITORY_PORT)
    private readonly reportTypeRepo: IReportTypeRepositoryPort,
  ) {}

  async execute(): Promise<PlayerReportTypeItem[]> {
    const types = await this.reportTypeRepo.findAllActive();
    return types.map((t) => ({ id: t.id, name: t.name }));
  }
}
