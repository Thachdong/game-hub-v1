import { withServiceResult, type CursorPage, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { Notification } from "./types.js";

/** GET /api/notifications */
export function listNotifications(input?: {
  cursor?: { createdAt: string; id: string };
}): Promise<ServiceResult<CursorPage<Notification>>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (query?: { cursor?: { createdAt: string; id: string } }) => ({
      url: "/api/notifications",
      params: query?.cursor
        ? { cursorCreatedAt: query.cursor.createdAt, cursorId: query.cursor.id }
        : undefined,
    }),
    mapResponse: (data) => data as CursorPage<Notification>,
  })(input);
}

/** PATCH /api/notifications/{id}/read */
export function markNotificationRead(input: { id: string }): Promise<ServiceResult<Notification>> {
  return withServiceResult(getClient(), {
    method: "PATCH",
    buildRequest: (data: { id: string }) => ({ url: `/api/notifications/${data.id}/read` }),
    mapResponse: (data) => data as Notification,
  })(input);
}
