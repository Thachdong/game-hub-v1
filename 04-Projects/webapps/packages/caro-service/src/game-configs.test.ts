import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createGameConfig,
  deactivateGameConfig,
  listGameConfigs,
  listGameConfigsAdmin,
  reactivateGameConfig,
  updateGameConfig,
} from "./game-configs.js";
import { configureCaroService, getClient } from "./http-client.js";

describe("game-configs", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureCaroService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("listGameConfigs unwraps the `items` envelope", async () => {
    mock.onGet("/api/caro/game-configs").reply(200, {
      statusCode: 200,
      message: "ok",
      data: { items: [{ id: "c1", boardSize: "18x18", moveTimeSeconds: 15, createdAt: "2026-01-01T00:00:00.000Z" }] },
    });

    const result = await listGameConfigs();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("listGameConfigsAdmin unwraps the `items` envelope", async () => {
    mock.onGet("/api/admin/caro/game-configs").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        items: [
          {
            id: "c1",
            boardSize: "18x18",
            moveTimeSeconds: 15,
            createdAt: "2026-01-01T00:00:00.000Z",
            active: true,
            createdBy: "admin-1",
            updatedAt: "2026-01-01T00:00:00.000Z",
            deactivatedBy: null,
            deactivatedAt: null,
          },
        ],
      },
    });

    const result = await listGameConfigsAdmin();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("createGameConfig posts boardSize/moveTimeSeconds", async () => {
    mock.onPost("/api/admin/caro/game-configs", { boardSize: "25x25", moveTimeSeconds: 10 }).reply(201, {
      statusCode: 201,
      message: "ok",
      data: {
        id: "c2",
        boardSize: "25x25",
        moveTimeSeconds: 10,
        createdAt: "2026-01-01T00:00:00.000Z",
        active: true,
        createdBy: "admin-1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deactivatedBy: null,
        deactivatedAt: null,
      },
    });

    const result = await createGameConfig({ boardSize: "25x25", moveTimeSeconds: 10 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe("c2");
  });

  it("updateGameConfig patches the config", async () => {
    mock.onPatch("/api/admin/caro/game-configs/c1").reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ boardSize: "40x40" });
      return [
        200,
        {
          statusCode: 200,
          message: "ok",
          data: {
            id: "c1",
            boardSize: "40x40",
            moveTimeSeconds: 15,
            createdAt: "2026-01-01T00:00:00.000Z",
            active: true,
            createdBy: "admin-1",
            updatedAt: "2026-01-02T00:00:00.000Z",
            deactivatedBy: null,
            deactivatedAt: null,
          },
        },
      ];
    });

    const result = await updateGameConfig({ id: "c1", boardSize: "40x40" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.boardSize).toBe("40x40");
  });

  it("deactivateGameConfig handles the backend's 204 No Content response", async () => {
    mock.onDelete("/api/admin/caro/game-configs/c1").reply(204);

    const result = await deactivateGameConfig({ id: "c1" });
    expect(result).toEqual({ ok: true, data: undefined, statusCode: 204, message: "" });
  });

  it("reactivateGameConfig maps the reactivated config", async () => {
    mock.onPost("/api/admin/caro/game-configs/c1/reactivate").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        id: "c1",
        boardSize: "18x18",
        moveTimeSeconds: 15,
        createdAt: "2026-01-01T00:00:00.000Z",
        active: true,
        createdBy: "admin-1",
        updatedAt: "2026-01-03T00:00:00.000Z",
        deactivatedBy: null,
        deactivatedAt: null,
      },
    });

    const result = await reactivateGameConfig({ id: "c1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.active).toBe(true);
  });
});
