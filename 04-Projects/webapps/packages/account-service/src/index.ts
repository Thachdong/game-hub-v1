import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { Account, Game } from "./types.js";

export { configureAccountService } from "./http-client.js";
export type { Account, Game } from "./types.js";

/** GET /api/accounts/me */
export function getCurrentAccount(): Promise<ServiceResult<Account>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/accounts/me" }),
    mapResponse: (data) => data as Account,
  })(undefined);
}

/** GET /api/games */
export function listGames(): Promise<ServiceResult<Game[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/games" }),
    mapResponse: (data) => data as Game[],
  })(undefined);
}
