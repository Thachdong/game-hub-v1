import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assignGameAdmin, removeGameAdmin } from "./game-admins.js";
import { configureAdminService, getClient } from "./http-client.js";

describe("game-admins", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureAdminService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("assignGameAdmin posts accountId and maps GameAdminRoleRecordDto", async () => {
    mock.onPost("/api/admin/games/g1/admins", { accountId: "acc-1" }).reply(201, {
      statusCode: 201,
      message: "ok",
      data: { accountId: "acc-1", gameId: "g1", grantedAt: "2026-01-01T00:00:00.000Z" },
    });

    const result = await assignGameAdmin({ gameId: "g1", accountId: "acc-1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.gameId).toBe("g1");
  });

  it("removeGameAdmin handles a 204 No Content response as success with undefined data", async () => {
    mock.onDelete("/api/admin/games/g1/admins/acc-1").reply(204);

    const result = await removeGameAdmin({ gameId: "g1", accountId: "acc-1" });
    expect(result).toEqual({ ok: true, data: undefined, statusCode: 204, message: "" });
  });

  it("returns UNAUTHORIZED for a non-admin caller (403)", async () => {
    mock.onPost("/api/admin/games/g1/admins").reply(403, { message: "Requires Platform Admin" });

    const result = await assignGameAdmin({ gameId: "g1", accountId: "acc-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("UNAUTHORIZED");
  });
});
