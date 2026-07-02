export interface SessionAccount {
  id: string;
  email: string;
  username: string;
  avatarUrl: string;
}

declare module "next-auth" {
  interface Session {
    account: SessionAccount;
    accessToken: string;
    /**
     * Set when the `jwt` callback's refresh-rotation fails to renew the access token — the
     * refresh token itself is no longer valid. Every consumer of this session (AppNav,
     * (protected)/layout.tsx, RequireSignIn) MUST treat its presence as equivalent to signed-out
     * (FR-004), even though `accessToken`/`account` may still be populated with stale values.
     */
    error?: "RefreshFailed";
  }

  interface User {
    accessToken: string;
    refreshToken: string;
    account: SessionAccount;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    account: SessionAccount;
    accessToken: string;
    accessTokenExpiresAt: number;
    /** Server-side only; never copied onto the client-visible Session. */
    refreshToken: string;
    error?: "RefreshFailed";
  }
}
