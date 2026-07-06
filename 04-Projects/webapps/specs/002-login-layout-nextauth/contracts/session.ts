/**
 * Contract for the NextAuth session/JWT shape this feature establishes, consumed by every Client
 * Component in `apps/web` (and, in a future feature, other apps under `apps/*`) via
 * `useSession()`/`auth()`.
 *
 * This file declares the PUBLIC CONTRACT ONLY — no implementation bodies. Implementation happens
 * during /speckit-tasks + /speckit-implement, as a `next-auth` module augmentation
 * (`declare module "next-auth"` / `declare module "next-auth/jwt"`) inside `apps/web/lib/auth.ts`
 * or a colocated `next-auth.d.ts`.
 */

export interface SessionAccount {
  id: string;
  email: string;
  username: string;
  avatarUrl: string;
}

/**
 * The client-visible session shape, i.e. what `useSession()`/`auth()` return in `.data`/session.
 * `accessToken` IS present here per spec.md's Clarifications (2026-07-03) — Client Components
 * attach it themselves as `Authorization: Bearer <accessToken>` when calling the existing domain
 * service packages (`@game-hub/account-service`, etc.).
 */
export interface AppSession {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  account: SessionAccount;
  accessToken: string;
  /**
   * Set when the `jwt` callback's refresh-rotation (research.md §5) fails to renew the access
   * token — i.e. the refresh token itself is no longer valid. Any consumer reading this session
   * MUST treat its presence as equivalent to signed-out (FR-004), even though `accessToken` may
   * still be populated with a stale value. See tasks.md T020/T024/T032.
   */
  error?: "RefreshFailed";
  expires: string; // ISO date-time; NextAuth's own session cookie expiry
}

/**
 * The server-only internal token shape (NextAuth's `JWT` type, augmented). `refreshToken` MUST
 * NEVER be copied from here onto `AppSession` — see constitution v2.0.0 Principle VI.
 */
export interface AppJWT {
  account: SessionAccount;
  accessToken: string;
  refreshToken: string; // server-side only; not present on AppSession
}

/**
 * Input this feature's Credentials provider's `authorize()` accepts. Supplied only by the
 * server-side `signIn('credentials', input)` call inside the `/api/auth/google/callback` Route
 * Handler (see auth-callback-route.md) — never called directly from a client form.
 */
export interface AuthorizeInput {
  accessToken: string;
  refreshToken: string;
  account: SessionAccount;
}

/** authorize() validates shape and returns a NextAuth User object, or null to reject sign-in. */
export declare function authorize(input: AuthorizeInput): Promise<
  | { id: string; accessToken: string; refreshToken: string; account: SessionAccount }
  | null
>;
