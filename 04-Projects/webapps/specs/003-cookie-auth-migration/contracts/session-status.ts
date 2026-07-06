/**
 * Contract for the only auth-related shape the browser ever sees. Produced by the server-only
 * getSessionStatus() helper (research.md §3) and returned verbatim by GET /api/auth/session.
 * Never contains a token — see data-model.md "SessionStatus".
 */
export interface SessionStatus {
  isSignedIn: boolean;
  account?: {
    id: string;
    email: string;
    username: string;
    avatarUrl: string;
  };
}
