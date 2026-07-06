import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { AdminAssignment } from "./types.js";

/** POST /api/admin/games/{gameId}/admins */
export function assignGameAdmin(input: {
  gameId: string;
  accountId: string;
}): Promise<ServiceResult<AdminAssignment>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { gameId: string; accountId: string }) => ({
      url: `/api/admin/games/${data.gameId}/admins`,
      body: { accountId: data.accountId },
    }),
    mapResponse: (data) => data as AdminAssignment,
  })(input);
}

/** DELETE /api/admin/games/{gameId}/admins/{accountId} */
export function removeGameAdmin(input: {
  gameId: string;
  accountId: string;
}): Promise<ServiceResult<void>> {
  return withServiceResult(getClient(), {
    method: "DELETE",
    buildRequest: (data: { gameId: string; accountId: string }) => ({
      url: `/api/admin/games/${data.gameId}/admins/${data.accountId}`,
    }),
    mapResponse: () => undefined as void,
  })(input);
}
