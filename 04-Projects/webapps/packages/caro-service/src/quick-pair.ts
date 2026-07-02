import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { QuickPairResult } from "./types.js";

/** POST /api/caro/quick-pair */
export function requestQuickPair(input: { configId: string }): Promise<ServiceResult<QuickPairResult>> {
  return withServiceResult(getClient(), {
    method: "POST",
    buildRequest: (body: { configId: string }) => ({ url: "/api/caro/quick-pair", body }),
    mapResponse: (data) => data as QuickPairResult,
  })(input);
}

/** DELETE /api/caro/quick-pair (cancel) */
export function cancelQuickPair(): Promise<ServiceResult<void>> {
  return withServiceResult(getClient(), {
    method: "DELETE",
    buildRequest: () => ({ url: "/api/caro/quick-pair" }),
    mapResponse: () => undefined as void,
  })(undefined);
}
