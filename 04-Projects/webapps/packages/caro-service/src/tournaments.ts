import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { ChatMessage, CreateTournamentInput } from "./types.js";

// The live OpenAPI contract documents no named response schemas for this entire group (every
// response is `description: ''` with no `content`) — data-model.md flagged this gap and tasks.md
// T050 calls for re-verifying against the live contract before finalizing; re-checked here and the
// gap still stands, so these stay `unknown` per contracts/caro-service.ts rather than guessing a
// shape.

/** POST /api/caro/tournament-creator-requests */
export function requestTournamentCreatorStatus(): Promise<ServiceResult<unknown>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: () => ({ url: "/api/caro/tournament-creator-requests" }),
    mapResponse: (data) => data,
  })(undefined);
}

/** POST /api/caro/tournaments */
export function createTournament(input: CreateTournamentInput): Promise<ServiceResult<unknown>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (body: CreateTournamentInput) => ({ url: "/api/caro/tournaments", body }),
    mapResponse: (data) => data,
  })(input);
}

/** GET /api/caro/tournaments */
export function listTournaments(input?: {
  status?: "waiting" | "in_progress" | "ended" | "cancelled";
  limit?: number;
  cursor?: string;
}): Promise<ServiceResult<unknown[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (query?: {
      status?: "waiting" | "in_progress" | "ended" | "cancelled";
      limit?: number;
      cursor?: string;
    }) => ({
      url: "/api/caro/tournaments",
      params: query as Record<string, unknown> | undefined,
    }),
    mapResponse: (data) => data as unknown[],
  })(input);
}

/** GET /api/caro/tournaments/{tournamentId} */
export function getTournament(input: { tournamentId: string }): Promise<ServiceResult<unknown>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (data: { tournamentId: string }) => ({
      url: `/api/caro/tournaments/${data.tournamentId}`,
    }),
    mapResponse: (data) => data,
  })(input);
}

/** POST /api/caro/tournaments/{tournamentId}/registrations */
export function registerForTournament(input: { tournamentId: string }): Promise<ServiceResult<unknown>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { tournamentId: string }) => ({
      url: `/api/caro/tournaments/${data.tournamentId}/registrations`,
    }),
    mapResponse: (data) => data,
  })(input);
}

/** GET /api/caro/tournaments/{tournamentId}/participants */
export function listTournamentParticipants(input: {
  tournamentId: string;
}): Promise<ServiceResult<unknown[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (data: { tournamentId: string }) => ({
      url: `/api/caro/tournaments/${data.tournamentId}/participants`,
    }),
    mapResponse: (data) => data as unknown[],
  })(input);
}

/** GET /api/caro/tournaments/{tournamentId}/chat */
export function listTournamentChat(input: { tournamentId: string }): Promise<ServiceResult<ChatMessage[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (data: { tournamentId: string }) => ({
      url: `/api/caro/tournaments/${data.tournamentId}/chat`,
    }),
    mapResponse: (data) => data as ChatMessage[],
  })(input);
}

/** POST /api/caro/tournaments/{tournamentId}/chat */
export function sendTournamentChat(input: {
  tournamentId: string;
  content: string;
}): Promise<ServiceResult<ChatMessage>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { tournamentId: string; content: string }) => ({
      url: `/api/caro/tournaments/${data.tournamentId}/chat`,
      body: { content: data.content },
    }),
    mapResponse: (data) => data as ChatMessage,
  })(input);
}

/** GET /api/caro/admin/tournament-creator-requests */
export function listTournamentCreatorRequests(input?: {
  status?: "pending" | "approved" | "rejected";
}): Promise<ServiceResult<unknown[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (query?: { status?: "pending" | "approved" | "rejected" }) => ({
      url: "/api/caro/admin/tournament-creator-requests",
      params: query as Record<string, unknown> | undefined,
    }),
    mapResponse: (data) => data as unknown[],
  })(input);
}

/** PATCH /api/caro/admin/tournament-creator-requests/{requestId} */
export function reviewTournamentCreatorRequest(input: {
  requestId: string;
  action: "approve" | "reject";
}): Promise<ServiceResult<unknown>> {
  return withServiceResult(getClient(), {
    method: "PATCH",
    buildRequest: (data: { requestId: string; action: "approve" | "reject" }) => ({
      url: `/api/caro/admin/tournament-creator-requests/${data.requestId}`,
      body: { action: data.action },
    }),
    mapResponse: (data) => data,
  })(input);
}

/** DELETE /api/caro/admin/tournament-creators/{playerId} */
export function revokeTournamentCreator(input: { playerId: string }): Promise<ServiceResult<void>> {
  return withServiceResult(getClient(), {
    method: "DELETE",
    buildRequest: (data: { playerId: string }) => ({
      url: `/api/caro/admin/tournament-creators/${data.playerId}`,
    }),
    mapResponse: () => undefined as void,
  })(input);
}
