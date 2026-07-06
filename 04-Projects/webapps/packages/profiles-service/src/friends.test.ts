import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listFriendRequests, listFriends, resolveFriendRequest, sendFriendRequest } from "./friends.js";
import { configureProfilesService, getClient } from "./http-client.js";

describe("friends", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureProfilesService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("sendFriendRequest posts targetEmail and maps FriendRequestRecordDto", async () => {
    mock.onPost("/api/friends/requests", { targetEmail: "b@c.com" }).reply(201, {
      statusCode: 201,
      message: "ok",
      data: {
        id: "req-1",
        senderId: "u1",
        receiverId: "u2",
        status: "pending",
        createdAt: "2026-01-01T00:00:00.000Z",
        resolvedAt: null,
      },
    });

    const result = await sendFriendRequest({ targetEmail: "b@c.com" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("pending");
  });

  it("listFriendRequests maps incoming/outgoing lists", async () => {
    mock.onGet("/api/friends/requests").reply(200, {
      statusCode: 200,
      message: "ok",
      data: { incoming: [], outgoing: [] },
    });

    const result = await listFriendRequests();
    expect(result).toEqual({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: { incoming: [], outgoing: [] },
    });
  });

  it("resolveFriendRequest sends the action in the request body", async () => {
    mock.onPatch("/api/friends/requests/req-1", { action: "accept" }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        id: "req-1",
        senderId: "u1",
        receiverId: "u2",
        status: "accepted",
        createdAt: "2026-01-01T00:00:00.000Z",
        resolvedAt: "2026-01-02T00:00:00.000Z",
      },
    });

    const result = await resolveFriendRequest({ id: "req-1", action: "accept" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("accepted");
  });

  it("listFriends unwraps the `friends` envelope into a plain array", async () => {
    mock.onGet("/api/friends").reply(200, {
      statusCode: 200,
      message: "ok",
      data: { friends: [{ id: "f1", email: "f@f.com", username: "fred", avatarUrl: "https://f" }] },
    });

    const result = await listFriends();
    expect(result).toEqual({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: [{ id: "f1", email: "f@f.com", username: "fred", avatarUrl: "https://f" }],
    });
  });
});
