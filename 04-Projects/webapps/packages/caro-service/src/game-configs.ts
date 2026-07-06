import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { AdminGameConfig, BoardSize, GameConfig, MoveTimeSeconds } from "./types.js";

/** GET /api/caro/game-configs */
export function listGameConfigs(): Promise<ServiceResult<GameConfig[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/caro/game-configs" }),
    mapResponse: (data) => (data as { items: GameConfig[] }).items,
  })(undefined);
}

/** GET /api/admin/caro/game-configs */
export function listGameConfigsAdmin(): Promise<ServiceResult<AdminGameConfig[]>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/admin/caro/game-configs" }),
    mapResponse: (data) => (data as { items: AdminGameConfig[] }).items,
  })(undefined);
}

/** POST /api/admin/caro/game-configs */
export function createGameConfig(input: {
  boardSize: BoardSize;
  moveTimeSeconds: MoveTimeSeconds;
}): Promise<ServiceResult<AdminGameConfig>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (body: { boardSize: BoardSize; moveTimeSeconds: MoveTimeSeconds }) => ({
      url: "/api/admin/caro/game-configs",
      body,
    }),
    mapResponse: (data) => data as AdminGameConfig,
  })(input);
}

/** PATCH /api/admin/caro/game-configs/{id} */
export function updateGameConfig(input: {
  id: string;
  boardSize?: BoardSize;
  moveTimeSeconds?: MoveTimeSeconds;
}): Promise<ServiceResult<AdminGameConfig>> {
  return withServiceResult(getClient(), {
    method: "PATCH",
    buildRequest: (data: { id: string; boardSize?: BoardSize; moveTimeSeconds?: MoveTimeSeconds }) => ({
      url: `/api/admin/caro/game-configs/${data.id}`,
      body: { boardSize: data.boardSize, moveTimeSeconds: data.moveTimeSeconds },
    }),
    mapResponse: (data) => data as AdminGameConfig,
  })(input);
}

/**
 * DELETE /api/admin/caro/game-configs/{id} (deactivate). The backend returns 204 No Content here
 * despite this function's declared `AdminGameConfig` output — service-core's 204 handling resolves
 * this to `data: undefined`, which callers should treat as "deactivated, refetch via
 * listGameConfigsAdmin for the updated record" rather than relying on the returned data.
 */
export function deactivateGameConfig(input: { id: string }): Promise<ServiceResult<AdminGameConfig>> {
  return withServiceResult(getClient(), {
    method: "DELETE",
    buildRequest: (data: { id: string }) => ({ url: `/api/admin/caro/game-configs/${data.id}` }),
    mapResponse: (data) => data as AdminGameConfig,
  })(input);
}

/** POST /api/admin/caro/game-configs/{id}/reactivate */
export function reactivateGameConfig(input: { id: string }): Promise<ServiceResult<AdminGameConfig>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (data: { id: string }) => ({
      url: `/api/admin/caro/game-configs/${data.id}/reactivate`,
    }),
    mapResponse: (data) => data as AdminGameConfig,
  })(input);
}
