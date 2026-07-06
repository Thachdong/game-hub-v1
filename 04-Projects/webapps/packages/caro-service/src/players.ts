import { withServiceResult, type CursorPage, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { CaroMatchHistoryItem, CaroPlayerProfile } from "./types.js";

/** GET /api/caro/players/me */
export function getMyPlayerProfile(): Promise<ServiceResult<CaroPlayerProfile>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/caro/players/me" }),
    mapResponse: (data) => data as CaroPlayerProfile,
  })(undefined);
}

/** GET /api/caro/players/{playerId} */
export function getPlayerProfile(input: { playerId: string }): Promise<ServiceResult<CaroPlayerProfile>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (data: { playerId: string }) => ({ url: `/api/caro/players/${data.playerId}` }),
    mapResponse: (data) => data as CaroPlayerProfile,
  })(input);
}

// The live OpenAPI doc names a single opaque `cursor` query param here (unlike notifications/
// admin-reports, which decompose into named cursorX params), but leaves MatchHistoryResponseDto's
// nextCursor shape undocumented ("type: object"). Encoding/decoding it as the same {createdAt, id}
// Cursor used everywhere else in this feature (per data-model.md) is the consistent assumption;
// verify against the live backend per tasks.md T050's sibling note on tournaments.
function encodeCursor(cursor?: { createdAt: string; id: string }): Record<string, unknown> | undefined {
  return cursor ? { cursor: `${cursor.createdAt}_${cursor.id}` } : undefined;
}

/** GET /api/caro/players/me/history */
export function getMyMatchHistory(input?: {
  cursor?: { createdAt: string; id: string };
}): Promise<ServiceResult<CursorPage<CaroMatchHistoryItem>>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (query?: { cursor?: { createdAt: string; id: string } }) => ({
      url: "/api/caro/players/me/history",
      params: encodeCursor(query?.cursor),
    }),
    mapResponse: (data) => data as CursorPage<CaroMatchHistoryItem>,
  })(input);
}

/** GET /api/caro/players/{playerId}/history */
export function getPlayerMatchHistory(input: {
  playerId: string;
  cursor?: { createdAt: string; id: string };
}): Promise<ServiceResult<CursorPage<CaroMatchHistoryItem>>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (data: { playerId: string; cursor?: { createdAt: string; id: string } }) => ({
      url: `/api/caro/players/${data.playerId}/history`,
      params: encodeCursor(data.cursor),
    }),
    mapResponse: (data) => data as CursorPage<CaroMatchHistoryItem>,
  })(input);
}
