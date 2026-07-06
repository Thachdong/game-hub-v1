import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listNotifications, markNotificationRead } from "./notifications.js";
import { configureProfilesService, getClient } from "./http-client.js";

describe("notifications", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureProfilesService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("listNotifications returns a CursorPage with nextCursor when more pages remain", async () => {
    mock.onGet("/api/notifications").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        items: [
          {
            id: "n1",
            type: "friend-or-game-invite",
            content: "hi",
            referenceId: null,
            isRead: false,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        nextCursor: { createdAt: "2026-01-01T00:00:00.000Z", id: "n1" },
      },
    });

    const result = await listNotifications();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.nextCursor).toEqual({ createdAt: "2026-01-01T00:00:00.000Z", id: "n1" });
      expect(result.data.items).toHaveLength(1);
    }
  });

  it("listNotifications sends cursorCreatedAt/cursorId query params when a cursor is provided", async () => {
    mock.onGet("/api/notifications").reply((config) => {
      expect(config.params).toEqual({ cursorCreatedAt: "2026-01-01T00:00:00.000Z", cursorId: "n1" });
      return [200, { statusCode: 200, message: "ok", data: { items: [], nextCursor: null } }];
    });

    await listNotifications({ cursor: { createdAt: "2026-01-01T00:00:00.000Z", id: "n1" } });
  });

  it("listNotifications returns null nextCursor on the last page", async () => {
    mock
      .onGet("/api/notifications")
      .reply(200, { statusCode: 200, message: "ok", data: { items: [], nextCursor: null } });

    const result = await listNotifications();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.nextCursor).toBeNull();
  });

  it("markNotificationRead maps the updated notification", async () => {
    mock.onPatch("/api/notifications/n1/read").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        id: "n1",
        type: "friend-or-game-invite",
        content: "hi",
        referenceId: null,
        isRead: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = await markNotificationRead({ id: "n1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.isRead).toBe(true);
  });
});
