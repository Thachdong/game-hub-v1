import { withServiceResult, type CursorPage, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { AdminReportEntry, AdminReportType, ConfirmReportResult } from "./types.js";

/** GET /api/admin/reports */
export function listReportsForModeration(input?: {
  cursor?: { createdAt: string; id: string };
}): Promise<ServiceResult<CursorPage<AdminReportEntry>>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (query?: { cursor?: { createdAt: string; id: string } }) => ({
      url: "/api/admin/reports",
      params: query?.cursor
        ? { cursorSubmittedAt: query.cursor.createdAt, cursorId: query.cursor.id }
        : undefined,
    }),
    mapResponse: (data) => data as CursorPage<AdminReportEntry>,
  })(input);
}

/** PATCH /api/admin/reports/{id}/confirm */
export function confirmReport(input: {
  id: string;
  decision: "valid" | "invalid";
}): Promise<ServiceResult<ConfirmReportResult>> {
  return withServiceResult(getClient(), {
    method: "PATCH",
    buildRequest: (data: { id: string; decision: "valid" | "invalid" }) => ({
      url: `/api/admin/reports/${data.id}/confirm`,
      body: { decision: data.decision },
    }),
    mapResponse: (data) => data as ConfirmReportResult,
  })(input);
}

/** GET /api/admin/report-types */
export function listReportTypesAdmin(): Promise<ServiceResult<AdminReportType[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/admin/report-types" }),
    mapResponse: (data) => (data as { items: AdminReportType[] }).items,
  })(undefined);
}

/** POST /api/admin/report-types */
export function createReportType(input: {
  name: string;
  deductionPoints: number;
}): Promise<ServiceResult<AdminReportType>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (body: { name: string; deductionPoints: number }) => ({
      url: "/api/admin/report-types",
      body,
    }),
    mapResponse: (data) => data as AdminReportType,
  })(input);
}

/** PATCH /api/admin/report-types/{id} */
export function updateReportType(input: {
  id: string;
  name?: string;
  deductionPoints?: number;
  active?: boolean;
}): Promise<ServiceResult<AdminReportType>> {
  return withServiceResult(getClient(), {
    method: "PATCH",
    buildRequest: (data: {
      id: string;
      name?: string;
      deductionPoints?: number;
      active?: boolean;
    }) => ({
      url: `/api/admin/report-types/${data.id}`,
      body: { name: data.name, deductionPoints: data.deductionPoints, active: data.active },
    }),
    mapResponse: (data) => data as AdminReportType,
  })(input);
}
