/**
 * Contract for `@game-hub/admin-service`. Covers FR-014, FR-015 — platform-wide administration
 * only (game-admin assignment, report moderation). Caro-specific admin lives in
 * `@game-hub/caro-service` — see research.md / spec.md Assumptions.
 */

import type { CursorPage, ServiceResult } from "./service-core";

export interface AdminAssignment {
  accountId: string;
  gameId: string;
  grantedAt: string;
}

/** POST /api/admin/games/{gameId}/admins */
export declare function assignGameAdmin(input: {
  gameId: string;
  accountId: string;
}): Promise<ServiceResult<AdminAssignment>>;

/** DELETE /api/admin/games/{gameId}/admins/{accountId} */
export declare function removeGameAdmin(input: {
  gameId: string;
  accountId: string;
}): Promise<ServiceResult<void>>;

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

/** GET /api/admin/reports */
export declare function listReportsForModeration(input?: {
  cursor?: { createdAt: string; id: string };
}): Promise<ServiceResult<CursorPage<AdminReportEntry>>>;

/** PATCH /api/admin/reports/{id}/confirm */
export declare function confirmReport(input: {
  id: string;
  decision: "valid" | "invalid";
}): Promise<ServiceResult<ConfirmReportResult>>;

export interface AdminReportType {
  id: string;
  name: string;
  deductionPoints: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/admin/report-types */
export declare function listReportTypesAdmin(): Promise<ServiceResult<AdminReportType[]>>;

/** POST /api/admin/report-types */
export declare function createReportType(input: {
  name: string;
  deductionPoints: number;
}): Promise<ServiceResult<AdminReportType>>;

/** PATCH /api/admin/report-types/{id} */
export declare function updateReportType(input: {
  id: string;
  name?: string;
  deductionPoints?: number;
  active?: boolean;
}): Promise<ServiceResult<AdminReportType>>;
