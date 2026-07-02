import { createHttpClient, withServiceResult, type ServiceResult } from "@game-hub/service-core";
import { getApiBaseUrl, getProxyBasePath } from "./config.js";

let accessToken: string | null = null;

/** Pure function; no network call. Caller does `window.location.href = getGoogleLoginUrl()`. */
export function getGoogleLoginUrl(): string {
  return `${getApiBaseUrl()}/api/auth/google`;
}

/** Reads the current access token from the in-memory store, or null if unauthenticated. */
export function getAccessToken(): string | null {
  return accessToken;
}

/** Internal setter used by the callback flow and by refreshSession; not for ad-hoc use by UI. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// The proxy route is always same-origin (baseURL ""), independent of the backend's own origin.
// onUnauthenticated is a no-op here (not wired to refreshSession) because this client IS the
// refresh/logout transport — retrying a failed refresh by calling refreshSession again would
// recurse indefinitely if the proxy itself ever returns 401.
export const proxyClient = createHttpClient({
  baseURL: "",
  getAccessToken,
  onUnauthenticated: async () => null,
});

/**
 * Calls the same-origin proxy route (never the backend directly). Renews the access token using
 * the httpOnly-cookie-held refresh token that only the proxy can read.
 */
export function refreshSession(): Promise<ServiceResult<{ accessToken: string }>> {
  return withServiceResult(proxyClient, {
    method: "POST",
    buildRequest: () => ({ url: `${getProxyBasePath()}/refresh` }),
    mapResponse: (data) => data as { accessToken: string },
  })(undefined).then((result) => {
    if (result.ok) {
      setAccessToken(result.data.accessToken);
    }
    return result;
  });
}

/**
 * Reusable `onUnauthenticated` implementation for other packages' `createHttpClient` config: on a
 * 401, this renews the session via `refreshSession` and hands back the new access token (or null),
 * which `createHttpClient` uses to retry the original request exactly once (service-core's
 * `http-client.ts`). Not used by this package's own `proxyClient` above — see the comment there.
 */
export async function handleSessionRefresh(): Promise<string | null> {
  const result = await refreshSession();
  return result.ok ? result.data.accessToken : null;
}

/** Clears the in-memory access token and asks the proxy to clear its refresh-token cookie. */
export function logout(): Promise<ServiceResult<void>> {
  return withServiceResult(proxyClient, {
    method: "POST",
    buildRequest: () => ({ url: `${getProxyBasePath()}/logout` }),
    mapResponse: () => undefined as void,
  })(undefined).finally(() => {
    setAccessToken(null);
  });
}
