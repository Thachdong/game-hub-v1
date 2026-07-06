import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { Report, ReportType } from "./types.js";

/** GET /api/report-types */
export function listReportTypes(): Promise<ServiceResult<ReportType[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/report-types" }),
    mapResponse: (data) => (data as { items: ReportType[] }).items,
  })(undefined);
}

/** POST /api/reports */
export function submitReport(input: {
  reportedUserId: string;
  reportTypeId: string;
  context: string;
}): Promise<ServiceResult<Report>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (body: { reportedUserId: string; reportTypeId: string; context: string }) => ({
      url: "/api/reports",
      body,
    }),
    mapResponse: (data) => data as Report,
  })(input);
}
