import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listMatchChat, muteMatchViewer, sendMatchChat } from "./chat.js";
import { configureCaroService, getClient } from "./http-client.js";

describe("chat", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureCaroService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("listMatchChat maps an array of ChatMessageResponseDto", async () => {
    mock.onGet("/api/caro/matches/m1/chat").reply(200, {
      statusCode: 200,
      message: "ok",
      data: [{ id: "msg1", matchId: "m1", senderId: "u1", content: "gg", sentAt: "2026-01-01T00:00:00.000Z" }],
    });

    const result = await listMatchChat({ matchId: "m1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("sendMatchChat posts content and maps the created message", async () => {
    mock.onPost("/api/caro/matches/m1/chat", { content: "hi" }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: { id: "msg2", matchId: "m1", senderId: "u1", content: "hi", sentAt: "2026-01-01T00:00:00.000Z" },
    });

    const result = await sendMatchChat({ matchId: "m1", content: "hi" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.content).toBe("hi");
  });

  it("muteMatchViewer posts viewerId", async () => {
    mock.onPost("/api/caro/matches/m1/chat/mute", { viewerId: "v1" }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: null,
    });

    const result = await muteMatchViewer({ matchId: "m1", viewerId: "v1" });
    expect(result.ok).toBe(true);
  });
});
