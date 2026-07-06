export interface AdminAssignment {
  accountId: string;
  gameId: string;
  grantedAt: string;
}

export interface AdminReportEntry {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reportTypeId: string;
  context: string;
  status: "pending" | "valid" | "invalid";
  appliedPoints: number | null;
  submittedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface TrustScoreSnapshot {
  score: number;
  locked: boolean;
  lockedUntil: string | null;
}

export interface ConfirmReportResult {
  id: string;
  status: "valid" | "invalid";
  appliedPoints: number | null;
  resolvedAt: string;
  resolvedBy: string;
  reportedUserTrustScore: TrustScoreSnapshot | null;
}

export interface AdminReportType {
  id: string;
  name: string;
  deductionPoints: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
