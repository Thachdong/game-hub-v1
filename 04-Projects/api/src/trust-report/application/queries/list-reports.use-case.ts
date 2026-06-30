import { Injectable, Inject } from '@nestjs/common';
import { Report, ReportStatus } from '../../domain/entities/report';
import {
  IReportRepositoryPort,
  REPORT_REPOSITORY_PORT,
} from '../../domain/ports/report.repository.port';

export interface ListReportsQuery {
  status: ReportStatus;
  cursor?: { submittedAt: Date; id: string };
  limit: number;
}

export interface ListReportsResult {
  items: Report[];
  nextCursor: { submittedAt: Date; id: string } | null;
}

@Injectable()
export class ListReportsUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY_PORT)
    private readonly reportRepo: IReportRepositoryPort,
  ) {}

  async execute(query: ListReportsQuery): Promise<ListReportsResult> {
    const items = await this.reportRepo.findByStatusPaginated(
      query.status,
      query.cursor,
      query.limit,
    );

    const nextCursor =
      items.length < query.limit
        ? null
        : { submittedAt: items[items.length - 1].submittedAt, id: items[items.length - 1].id };

    return { items, nextCursor };
  }
}
