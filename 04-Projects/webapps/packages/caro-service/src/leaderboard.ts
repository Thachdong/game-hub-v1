import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { LeaderboardEntry } from "./types.js";

/** GET /api/caro/leaderboard */
export function getLeaderboard(): Promise<ServiceResult<LeaderboardEntry[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/caro/leaderboard" }),
    mapResponse: (data) => (data as { entries: LeaderboardEntry[] }).entries,
  })(undefined);
}
