import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { ReportTypeOrmEntity } from './typeorm-entities/report-type.orm-entity';
import { IReportTypeRepositoryPort } from '../../domain/ports/report-type.repository.port';
import { ReportType } from '../../domain/entities/report-type';
import { ReportTypeNameTakenError, ReportTypeNotFoundError } from '../../domain/errors';

@Injectable()
export class ReportTypeOrmRepository implements IReportTypeRepositoryPort {
  constructor(
    @InjectRepository(ReportTypeOrmEntity)
    private readonly repo: Repository<ReportTypeOrmEntity>,
  ) {}

  async findAllActive(): Promise<ReportType[]> {
    const rows = await this.repo.find({
      where: { active: true },
      order: { name: 'ASC' },
    });
    return rows.map(this.toDomain);
  }

  async findById(id: string, includeInactive = false): Promise<ReportType | null> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) return null;
    if (!includeInactive && !row.active) return null;
    return this.toDomain(row);
  }

  async save(data: Omit<ReportType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportType> {
    try {
      const row = this.repo.create({
        name: data.name,
        deductionPoints: data.deductionPoints,
        active: data.active,
      });
      const saved = await this.repo.save(row);
      return this.toDomain(saved);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).driverError?.code === '23505') {
        throw new ReportTypeNameTakenError();
      }
      throw err;
    }
  }

  async update(
    id: string,
    fields: Partial<Pick<ReportType, 'name' | 'deductionPoints' | 'active'>>,
  ): Promise<ReportType> {
    try {
      await this.repo.update({ id }, fields);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).driverError?.code === '23505') {
        throw new ReportTypeNameTakenError();
      }
      throw err;
    }
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new ReportTypeNotFoundError();
    return this.toDomain(row);
  }

  async findAll(): Promise<ReportType[]> {
    const rows = await this.repo.find({ order: { createdAt: 'ASC' } });
    return rows.map(this.toDomain);
  }

  private toDomain(row: ReportTypeOrmEntity): ReportType {
    const entity = new ReportType();
    entity.id = row.id;
    entity.name = row.name;
    entity.deductionPoints = row.deductionPoints;
    entity.active = row.active;
    entity.createdAt = row.createdAt;
    entity.updatedAt = row.updatedAt;
    return entity;
  }
}
