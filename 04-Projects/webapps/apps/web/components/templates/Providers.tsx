"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { SessionStatus } from "@/lib/session";

interface AuthSessionContextValue extends SessionStatus {
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function Providers({
  session,
  children,
}: {
  session: SessionStatus;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<SessionStatus>(session);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/auth/session");
    setStatus((await response.json()) as SessionStatus);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setStatus({ isSignedIn: false });
  }, []);

  return (
    <AuthSessionContext.Provider value={{ ...status, refresh, logout }}>
      {children}
    </AuthSessionContext.Provider>
  );
}

/** Replaces NextAuth's useSession() — never exposes a token, only isSignedIn/account. */
export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used within <Providers>");
  }
  return context;
}
