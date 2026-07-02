"use client";

import { signOut, useSession } from "next-auth/react";
import { Avatar } from "@/components/atoms/Avatar";
import { Button } from "@/components/atoms/Button";
import { NavLink } from "@/components/atoms/NavLink";

export function AppNav() {
  const { data: session, status } = useSession();

  // FR-004: a session whose refresh-rotation failed must render as signed-out, even though
  // NextAuth's own `status` still reports "authenticated" (it only reflects whether ANY session
  // object exists, not this app-specific error flag — see contracts/session.ts).
  const isSignedIn = status === "authenticated" && !session?.error;
  const isLoading = status === "loading";

  return (
    <nav className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-4">
        <NavLink href="/game-caro">Caro</NavLink>
      </div>

      <div className="flex items-center gap-3">
        {isLoading ? (
          <div
            role="status"
            aria-label="Loading sign-in state"
            className="h-8 w-24 animate-pulse rounded-md bg-gray-200"
          />
        ) : isSignedIn ? (
          <>
            <Avatar src={session.account.avatarUrl} alt={session.account.username} />
            <span className="text-sm font-medium">{session.account.username}</span>
            <Button onClick={() => signOut({ redirectTo: "/login" })}>Sign out</Button>
          </>
        ) : (
          <NavLink href="/login">Sign in</NavLink>
        )}
      </div>
    </nav>
  );
}
