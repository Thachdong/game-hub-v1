/**
 * SUPERSEDED 2026-07-02: `@game-hub/auth-service` (implementing this contract) was removed.
 * Session/token lifecycle is now delegated to NextAuth (Auth.js) inside the future `apps/*`
 * Next.js app — see constitution v2.0.0 Principle VI and research.md §5. Kept for historical
 * reference only; do not implement against this contract.
 *
 * Original contract for `@game-hub/auth-service`.
 *
 * Split in two: `client.ts` exports are safe to call from browser code. `bff.ts` exports must only
 * ever be invoked from server-side code (a Next.js Route Handler in whichever app consumes this
 * package) — they are the sole holders of the refresh token. See research.md §5.
 */

import type { ServiceResult } from "./service-core";

export interface Account {
  id: string;
  email: string;
  username: string;
  avatarUrl: string;
}

// ---------------------------------------------------------------------------
// client.ts — browser-safe
// ---------------------------------------------------------------------------

/** Pure function; no network call. Caller does `window.location.href = getGoogleLoginUrl()`. */
export declare function getGoogleLoginUrl(): string;

/** Reads the current access token from the in-memory store, or null if unauthenticated. */
export declare function getAccessToken(): string | null;

/** Internal setter used by the callback flow and by refreshSession; not for ad-hoc use by UI. */
export declare function setAccessToken(token: string | null): void;

/**
 * Calls the same-origin proxy route (never the backend directly). Renews the access token using
 * the httpOnly-cookie-held refresh token that only the proxy can read.
 */
export declare function refreshSession(): Promise<ServiceResult<{ accessToken: string }>>;

/** Clears the in-memory access token and asks the proxy to clear its refresh-token cookie. */
export declare function logout(): Promise<ServiceResult<void>>;

// ---------------------------------------------------------------------------
// bff.ts — server-side only (invoked from a Route Handler; never imported by client bundles)
// ---------------------------------------------------------------------------

export interface GoogleCallbackParams {
  code: string;
  state?: string;
}

export interface ExchangeGoogleCallbackResult {
  accessToken: string;
  account: Account;
  /** Route Handler must set this on its Set-Cookie response header (httpOnly, Secure, SameSite=Strict). */
  refreshTokenCookieValue: string;
}

/** Calls backend GET /api/auth/google/callback, extracts the refresh token for cookie storage. */
export declare function exchangeGoogleCallback(
  params: GoogleCallbackParams
): Promise<ServiceResult<ExchangeGoogleCallbackResult>>;

/**
 * Calls backend POST /api/auth/refresh using the refresh token read from the incoming request's
 * httpOnly cookie (passed in by the Route Handler, not read here — this function stays
 * framework-agnostic).
 */
export declare function rotateAccessToken(
  refreshTokenFromCookie: string
): Promise<ServiceResult<{ accessToken: string }>>;

/** No backend call needed — the backend exposes no session-invalidation endpoint. Route Handler clears its own cookie after calling this for symmetry/future-proofing. */
export declare function clearSession(): Promise<ServiceResult<void>>;
