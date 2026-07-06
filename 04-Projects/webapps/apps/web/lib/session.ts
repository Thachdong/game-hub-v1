import { cookies } from "next/headers";
import { configureAccountService, getCurrentAccount } from "@game-hub/account-service";

export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";

const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — see research.md §2

export interface SessionAccount {
  id: string;
  email: string;
  username: string;
  avatarUrl: string;
}

export interface SessionStatus {
  isSignedIn: boolean;
  account?: SessionAccount;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  account: SessionAccount;
}

export interface RefreshResult {
  accessToken: string;
}

export function decodeJwtExpiryMs(accessToken: string): number {
  const payload = accessToken.split(".")[1];
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as {
    exp: number;
  };
  return decoded.exp * 1000;
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Sets both auth cookies on the current outgoing response (login route only). */
export async function setAuthCookies(result: LoginResult): Promise<void> {
  const store = await cookies();
  const accessMaxAge = Math.max(
    1,
    Math.floor((decodeJwtExpiryMs(result.accessToken) - Date.now()) / 1000)
  );
  store.set(ACCESS_COOKIE_NAME, result.accessToken, cookieOptions(accessMaxAge));
  store.set(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions(REFRESH_COOKIE_MAX_AGE_SECONDS));
}

/** Clears both auth cookies on the current outgoing response (logout route only). */
export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE_NAME, "", cookieOptions(0));
  store.set(REFRESH_COOKIE_NAME, "", cookieOptions(0));
}

// Keyed by the refresh token value itself (not a single module-level slot) so concurrent
// refreshes for two different visitors' sessions never share one another's in-flight result
// (research.md §4, FR-008).
const inFlightRefreshes = new Map<string, Promise<string | null>>();

/**
 * Reads the refresh_token cookie, calls the backend's refresh endpoint, and re-sets the
 * access_token cookie on the current response on success. Returns the new access token, or null
 * if the refresh token itself is no longer valid (FR-005).
 *
 * Attempting to set a cookie outside a Route Handler/Server Action (e.g. from a Server
 * Component's render, such as the root layout) throws in Next.js; that failure is swallowed here
 * so the refreshed token can still be used for the current render even though it won't persist
 * until a later Route Handler call (e.g. the client's next GET /api/auth/session) re-sets it.
 */
export async function refreshSession(): Promise<string | null> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return null;

  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) return existing;

  const attempt = (async () => {
    try {
      const response = await fetch(`${process.env.BACKEND_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return null;

      const body = (await response.json()) as { data: RefreshResult };
      const accessToken = body.data.accessToken;

      try {
        const maxAge = Math.max(1, Math.floor((decodeJwtExpiryMs(accessToken) - Date.now()) / 1000));
        store.set(ACCESS_COOKIE_NAME, accessToken, cookieOptions(maxAge));
      } catch {
        // Called from a context that can't mutate cookies (e.g. a Server Component render) —
        // the caller still gets the fresh token for this request; persistence happens on the
        // next Route Handler call instead.
      }

      return accessToken;
    } catch {
      return null;
    }
  })();

  inFlightRefreshes.set(refreshToken, attempt);
  try {
    return await attempt;
  } finally {
    inFlightRefreshes.delete(refreshToken);
  }
}

/**
 * Resolves the access_token cookie and configures @game-hub/account-service to use it, wiring
 * refreshSession() as the transparent-renewal callback. This is the one place any server-side
 * code that needs the visitor's identity/backend access MUST go through (FR-011) — a future proxy
 * route for tournament/admin/Caro actions should call this same function, not reimplement it.
 */
async function configureAccountServiceFromCookies(accessToken: string | null): Promise<void> {
  configureAccountService({
    getAccessToken: () => accessToken,
    onUnauthenticated: refreshSession,
  });
}

/** Server-only. The single source of truth for "is this visitor signed in, and as whom." */
export async function getSessionStatus(): Promise<SessionStatus> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  if (!accessToken) return { isSignedIn: false };

  await configureAccountServiceFromCookies(accessToken);
  const result = await getCurrentAccount();
  if (!result.ok) return { isSignedIn: false };

  return { isSignedIn: true, account: result.data };
}
