import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { LobbyMatch, MatchState } from "./types.js";

/** GET /api/caro/matches/lobby */
export function listLobbyMatches(): Promise<ServiceResult<LobbyMatch[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/caro/matches/lobby" }),
    mapResponse: (data) => data as LobbyMatch[],
  })(undefined);
}

interface CreateMatchResult {
  id: string;
  configId: string;
  boardSize: string;
  moveTimeSeconds: number;
  visibility: string;
  status: string;
  creatorId: string;
  createdAt: string;
}

/** POST /api/caro/matches */
export function createMatch(input: {
  configId: string;
  visibility: "public" | "private";
}): Promise<ServiceResult<CreateMatchResult>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (body: { configId: string; visibility: "public" | "private" }) => ({
      url: "/api/caro/matches",
      body,
    }),
    mapResponse: (data) => data as CreateMatchResult,
  })(input);
}

/** POST /api/caro/matches/{id}/join */
export function joinMatch(input: { id: string }): Promise<ServiceResult<{ matchId: string; status: string }>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { id: string }) => ({ url: `/api/caro/matches/${data.id}/join` }),
    mapResponse: (data) => data as { matchId: string; status: string },
  })(input);
}

/** GET /api/caro/matches/{id} */
export function getMatch(input: { id: string }): Promise<ServiceResult<MatchState>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (data: { id: string }) => ({ url: `/api/caro/matches/${data.id}` }),
    mapResponse: (data) => data as MatchState,
  })(input);
}

/**
 * POST /api/caro/matches/{id}/leave — the live API exposes leaving (this endpoint, second player,
 * pre-start) and creator-cancel (`DELETE /api/caro/matches/{id}`) as two separate operations; the
 * contract's declared `DELETE .../leave` path doesn't exist. This implements the "leave" semantics
 * the function name and CancelOrLeaveResponseDto output type both describe.
 */
export function leaveMatch(input: { id: string }): Promise<ServiceResult<{ id: string; status: string }>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { id: string }) => ({ url: `/api/caro/matches/${data.id}/leave` }),
    mapResponse: (data) => data as { id: string; status: string },
  })(input);
}

/** POST /api/caro/matches/{id}/invite */
export function inviteToMatch(input: {
  id: string;
  friendId: string;
}): Promise<ServiceResult<{ matchId: string; invitedPlayerId: string }>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { id: string; friendId: string }) => ({
      url: `/api/caro/matches/${data.id}/invite`,
      body: { friendId: data.friendId },
    }),
    mapResponse: (data) => data as { matchId: string; invitedPlayerId: string },
  })(input);
}

/** PUT /api/caro/matches/{id}/invitation/respond */
export function respondToMatchInvitation(input: {
  id: string;
  action: "accept" | "decline";
}): Promise<ServiceResult<{ matchId: string; status: string }>> {
  return withServiceResult(getClient(), {
    method: "PUT",
    buildRequest: (data: { id: string; action: "accept" | "decline" }) => ({
      url: `/api/caro/matches/${data.id}/invitation/respond`,
      body: { action: data.action },
    }),
    mapResponse: (data) => data as { matchId: string; status: string },
  })(input);
}
