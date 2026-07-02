import type { JWT } from "next-auth/jwt";
import type { SessionAccount } from "./next-auth.d.ts";

export function decodeJwtExpiryMs(accessToken: string): number {
  const payload = accessToken.split(".")[1];
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as {
    exp: number;
  };
  return decoded.exp * 1000;
}

// Renews the access token via the backend's refresh endpoint (research.md §6, FR-003). On
// failure, the refresh token itself is no longer valid — mark the token so every session
// consumer (AppNav, (protected)/layout.tsx, RequireSignIn) treats this as signed-out (FR-004).
export async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Refresh failed with status ${response.status}`);
    }

    const body = (await response.json()) as { data: { accessToken: string } };
    const accessToken = body.data.accessToken;

    return {
      ...token,
      accessToken,
      accessTokenExpiresAt: decodeJwtExpiryMs(accessToken),
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshFailed" };
  }
}

export function parseAccount(raw: unknown): SessionAccount | null {
  if (!raw) return null;
  const account = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (
    typeof account === "object" &&
    account !== null &&
    typeof account.id === "string" &&
    typeof account.email === "string" &&
    typeof account.username === "string" &&
    typeof account.avatarUrl === "string"
  ) {
    return account as SessionAccount;
  }
  return null;
}
