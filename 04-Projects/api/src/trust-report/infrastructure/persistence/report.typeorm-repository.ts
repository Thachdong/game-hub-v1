import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ReportOrmEntity } from './typeorm-entities/report.orm-entity';
import { IReportRepositoryPort } from '../../domain/ports/report.repository.port';
import { Report, ReportStatus } from '../../domain/entities/report';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReportOrmRepository implements IReportRepositoryPort {
  constructor(
    @InjectRepository(ReportOrmEntity)
    private readonly repo: Repository<ReportOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async save(data: Omit<Report, 'id' | 'submittedAt'>): Promise<Report> {
    const row = this.repo.create({
      id: uuidv4(),
      reporterId: data.reporterId,
      reportedUserId: data.reportedUserId,
      reportTypeId: data.reportTypeId,
      context: data.context,
      status: data.status,
      appliedPoints: data.appliedPoints,
      resolvedAt: data.resolvedAt,
      resolvedBy: data.resolvedBy,
    });
    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Report | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByStatusPaginated(
    status: ReportStatus,
    cursor: { submittedAt: Date; id: string } | undefined,
    limit: number,
  ): Promise<Report[]> {
    const qb = this.dataSource
      .createQueryBuilder(ReportOrmEntity, 'r')
      .where('r.status = :status', { status })
      .orderBy('r.submittedAt', 'DESC')
      .addOrderBy('r.id', 'DESC')
      .limit(limit);

    if (cursor) {
      qb.andWhere(
        '(r.submitted_at, r.id) < (:cursorSubmittedAt::timestamptz, :cursorId::uuid)',
        { cursorSubmittedAt: cursor.submittedAt.toISOString(), cursorId: cursor.id },
      );
    }

    const rows = await qb.getMany();
    return rows.map(this.toDomain);
  }

  async update(
    id: string,
    fields: Partial<Pick<Report, 'status' | 'appliedPoints' | 'resolvedAt' | 'resolvedBy'>>,
  ): Promise<Report> {
    await this.repo.update({ id }, fields);
    const row = await this.repo.findOne({ where: { id } });
    return this.toDomain(row!);
  }

  private toDomain(row: ReportOrmEntity): Report {
    const entity = new Report();
    entity.id = row.id;
    entity.reporterId = row.reporterId;
    entity.reportedUserId = row.reportedUserId;
    entity.reportTypeId = row.reportTypeId;
    entity.context = row.context;
    entity.status = row.status;
    entity.appliedPoints = row.appliedPoints;
    entity.submittedAt = row.submittedAt;
    entity.resolvedAt = row.resolvedAt;
    entity.resolvedBy = row.resolvedBy;
    return entity;
  }
}
