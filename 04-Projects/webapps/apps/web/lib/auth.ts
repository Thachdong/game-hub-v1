import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { decodeJwtExpiryMs, parseAccount, refreshAccessToken } from "./token-refresh.js";
import type { SessionAccount } from "./next-auth.d.ts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      // No form fields — this provider is never rendered as a login form. It is only ever
      // invoked server-side via signIn('credentials', {...}) from the OAuth callback proxy
      // Route Handler (research.md §3), which has already completed the real authentication.
      credentials: {},
      async authorize(raw: Record<string, unknown>) {
        const accessToken = raw?.accessToken;
        const refreshToken = raw?.refreshToken;
        const account = parseAccount(raw?.account);

        if (
          typeof accessToken !== "string" ||
          typeof refreshToken !== "string" ||
          !account
        ) {
          return null;
        }

        return { id: account.id, accessToken, refreshToken, account };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in — `user` is exactly what authorize() returned.
        const initial = user as unknown as {
          accessToken: string;
          refreshToken: string;
          account: SessionAccount;
        };
        token.accessToken = initial.accessToken;
        token.refreshToken = initial.refreshToken;
        token.account = initial.account;
        token.accessTokenExpiresAt = decodeJwtExpiryMs(initial.accessToken);
        token.error = undefined;
        return token;
      }

      if (Date.now() < token.accessTokenExpiresAt) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.account = token.account;
      session.accessToken = token.accessToken;
      if (token.error) {
        session.error = token.error;
      }
      return session;
    },
  },
});
