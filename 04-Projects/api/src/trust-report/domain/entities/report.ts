export enum ReportStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid',
}

export class Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reportTypeId: string;
  context: string;
  status: ReportStatus;
  appliedPoints: number | null;
  submittedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}
