import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { ChatMessage } from "./types.js";

/** GET /api/caro/matches/{matchId}/chat */
export function listMatchChat(input: { matchId: string }): Promise<ServiceResult<ChatMessage[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: (data: { matchId: string }) => ({ url: `/api/caro/matches/${data.matchId}/chat` }),
    mapResponse: (data) => data as ChatMessage[],
  })(input);
}

/** POST /api/caro/matches/{matchId}/chat */
export function sendMatchChat(input: {
  matchId: string;
  content: string;
}): Promise<ServiceResult<ChatMessage>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { matchId: string; content: string }) => ({
      url: `/api/caro/matches/${data.matchId}/chat`,
      body: { content: data.content },
    }),
    mapResponse: (data) => data as ChatMessage,
  })(input);
}

/** POST /api/caro/matches/{matchId}/chat/mute */
export function muteMatchViewer(input: {
  matchId: string;
  viewerId: string;
}): Promise<ServiceResult<void>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { matchId: string; viewerId: string }) => ({
      url: `/api/caro/matches/${data.matchId}/chat/mute`,
      body: { viewerId: data.viewerId },
    }),
    mapResponse: () => undefined as void,
  })(input);
}
