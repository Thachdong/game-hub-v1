"use server";

import { cookies } from "next/headers";
import { listReportTypes, submitReport } from "@game-hub/profiles-service";
import { ACCESS_COOKIE_NAME, ensureProfilesServiceConfigured } from "@/lib/session";

/**
 * Server Actions are the service-interface boundary (constitution Principle IV) for the Report
 * action (research.md §7): @game-hub/profiles-service's http client requires the request's own
 * httpOnly-cookie access token, which browser JS must never hold (Principle VI).
 */
async function withProfilesService<T>(run: () => Promise<T>): Promise<T> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  await ensureProfilesServiceConfigured(accessToken);
  return run();
}

export async function listReportTypesAction() {
  return withProfilesService(() => listReportTypes());
}

export async function submitReportAction(input: {
  reportedUserId: string;
  reportTypeId: string;
  context: string;
}) {
  return withProfilesService(() => submitReport(input));
}
