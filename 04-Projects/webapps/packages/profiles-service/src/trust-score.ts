import { withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getClient } from "./http-client.js";
import type { TrustScore } from "./types.js";

interface TrustScoreResponseDto {
  score: number;
  gameLocked: boolean;
  gameLockedUntil: string | null;
  lastRecoveryDate: string | null;
  updatedAt: string;
}

/** GET /api/trust-score/me */
export function getMyTrustScore(): Promise<ServiceResult<TrustScore>> {
  return withServiceResult(getClient(), {
    method: "GET",
    buildRequest: () => ({ url: "/api/trust-score/me" }),
    mapResponse: (data): TrustScore => {
      const dto = data as TrustScoreResponseDto;
      return {
        score: dto.score,
        locked: dto.gameLocked,
        lockedUntil: dto.gameLockedUntil,
        lastRecoveryDate: dto.lastRecoveryDate,
        updatedAt: dto.updatedAt,
      };
    },
  })(undefined);
}
