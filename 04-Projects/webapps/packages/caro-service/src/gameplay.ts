import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { MatchState, PlaceMoveResult } from "./types.js";

/** POST /api/caro/matches/{id}/start */
export function startMatch(input: { id: string }): Promise<ServiceResult<MatchState>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { id: string }) => ({ url: `/api/caro/matches/${data.id}/start` }),
    mapResponse: (data) => data as MatchState,
  })(input);
}

/** POST /api/caro/matches/{id}/moves */
export function submitMove(input: {
  id: string;
  row: number;
  col: number;
}): Promise<ServiceResult<PlaceMoveResult>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { id: string; row: number; col: number }) => ({
      url: `/api/caro/matches/${data.id}/moves`,
      body: { row: data.row, col: data.col },
    }),
    mapResponse: (data) => data as PlaceMoveResult,
  })(input);
}

/** POST /api/caro/matches/{id}/surrender */
export function surrenderMatch(input: { id: string }): Promise<ServiceResult<MatchState>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { id: string }) => ({ url: `/api/caro/matches/${data.id}/surrender` }),
    mapResponse: (data) => data as MatchState,
  })(input);
}

/** POST /api/caro/matches/{id}/draw-request */
export function requestDraw(input: { id: string }): Promise<ServiceResult<MatchState>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { id: string }) => ({ url: `/api/caro/matches/${data.id}/draw-request` }),
    mapResponse: (data) => data as MatchState,
  })(input);
}

/** PUT /api/caro/matches/{id}/draw-request/respond */
export function respondToDrawRequest(input: {
  id: string;
  action: "accept" | "decline";
}): Promise<ServiceResult<MatchState>> {
  return withServiceResult(getClient(), {
    method: "PUT",
    buildRequest: (data: { id: string; action: "accept" | "decline" }) => ({
      url: `/api/caro/matches/${data.id}/draw-request/respond`,
      body: { action: data.action },
    }),
    mapResponse: (data) => data as MatchState,
  })(input);
}
