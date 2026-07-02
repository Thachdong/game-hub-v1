import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReportStatus } from '../../../domain/entities/report';

@Entity({ schema: 'trust_report', name: 'reports' })
export class ReportOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId: string;

  @Column({ name: 'reported_user_id', type: 'uuid' })
  reportedUserId: string;

  @Column({ name: 'report_type_id', type: 'uuid' })
  reportTypeId: string;

  @Column({ type: 'text' })
  context: string;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Column({ name: 'applied_points', type: 'int', nullable: true })
  appliedPoints: number | null;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;
}
