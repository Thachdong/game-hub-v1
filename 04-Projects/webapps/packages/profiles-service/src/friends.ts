import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { Friend, FriendRequestRecord, FriendRequestsList } from "./types.js";

/** POST /api/friends/requests */
export function sendFriendRequest(input: {
  targetEmail: string;
}): Promise<ServiceResult<FriendRequestRecord>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (body: { targetEmail: string }) => ({
      url: "/api/friends/requests",
      body,
    }),
    mapResponse: (data) => data as FriendRequestRecord,
  })(input);
}

/** GET /api/friends/requests */
export function listFriendRequests(): Promise<ServiceResult<FriendRequestsList>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/friends/requests" }),
    mapResponse: (data) => data as FriendRequestsList,
  })(undefined);
}

/** PATCH /api/friends/requests/{id} */
export function resolveFriendRequest(input: {
  id: string;
  action: "accept" | "reject";
}): Promise<ServiceResult<FriendRequestRecord>> {
  return withServiceResult(getClient(), {
    method: "PATCH",
    buildRequest: (data: { id: string; action: "accept" | "reject" }) => ({
      url: `/api/friends/requests/${data.id}`,
      body: { action: data.action },
    }),
    mapResponse: (data) => data as FriendRequestRecord,
  })(input);
}

/** GET /api/friends */
export function listFriends(): Promise<ServiceResult<Friend[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/friends" }),
    mapResponse: (data) => (data as { friends: Friend[] }).friends,
  })(undefined);
}
