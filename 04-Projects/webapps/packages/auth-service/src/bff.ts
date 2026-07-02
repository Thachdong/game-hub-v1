import { createHttpClient, withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { configureAuthService, getApiBaseUrl } from "./config.js";
import type { Account, ExchangeGoogleCallbackResult, GoogleCallbackParams } from "./types.js";

export { configureAuthService };

interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  account: Account;
}

interface RefreshResponseDto {
  accessToken: string;
}

// This module only ever runs server-side (a Route Handler), so it always talks to the backend
// directly and never attaches an access token of its own — it's the refresh-token holder, not a
// bearer of one. onUnauthenticated is a no-op: a 401 here means the credential itself (the
// authorization code, or the refresh token passed in explicitly) is invalid, not that a retry
// could help.
//
// Cached per `apiBaseUrl` value (not per module load) so a `configureAuthService({ apiBaseUrl })`
// call before first use takes effect — axios instances don't pick up baseURL changes after
// construction — while still returning a stable instance callers/tests can attach mocks to.
let cachedClient: ReturnType<typeof createHttpClient> | undefined;
let cachedBaseUrl: string | undefined;

export function getBackendClient(): ReturnType<typeof createHttpClient> {
  const baseUrl = getApiBaseUrl();
  if (!cachedClient || cachedBaseUrl !== baseUrl) {
    cachedClient = createHttpClient({
      baseURL: baseUrl,
      getAccessToken: () => null,
      onUnauthenticated: async () => null,
    });
    cachedBaseUrl = baseUrl;
  }
  return cachedClient;
}

/** Calls backend GET /api/auth/google/callback, extracts the refresh token for cookie storage. */
export function exchangeGoogleCallback(
  params: GoogleCallbackParams
): Promise<ServiceResult<ExchangeGoogleCallbackResult>> {
  return withServiceResult(getBackendClient(), {
    method: "GET",
    buildRequest: (input: GoogleCallbackParams) => ({
      url: "/api/auth/google/callback",
      params: { code: input.code, ...(input.state ? { state: input.state } : {}) },
    }),
    mapResponse: (data): ExchangeGoogleCallbackResult => {
      const dto = data as LoginResponseDto;
      return {
        accessToken: dto.accessToken,
        account: dto.account,
        refreshTokenCookieValue: dto.refreshToken,
      };
    },
  })(params);
}

/**
 * Calls backend POST /api/auth/refresh using the refresh token read from the incoming request's
 * httpOnly cookie (passed in by the Route Handler, not read here — this function stays
 * framework-agnostic).
 */
export function rotateAccessToken(
  refreshTokenFromCookie: string
): Promise<ServiceResult<{ accessToken: string }>> {
  return withServiceResult(getBackendClient(), {
    method: "POST",
    buildRequest: (refreshToken: string) => ({
      url: "/api/auth/refresh",
      body: { refreshToken },
    }),
    mapResponse: (data) => data as RefreshResponseDto,
  })(refreshTokenFromCookie);
}

/** No backend call needed — the backend exposes no session-invalidation endpoint. Route Handler clears its own cookie after calling this for symmetry/future-proofing. */
export async function clearSession(): Promise<ServiceResult<void>> {
  return { ok: true, data: undefined, statusCode: 200, message: "Session cleared" };
}
