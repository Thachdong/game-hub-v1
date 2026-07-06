"use client";

import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/templates/Providers";
import { Avatar } from "@/components/atoms/Avatar";
import { Button } from "@/components/atoms/Button";
import { NavLink } from "@/components/atoms/NavLink";

export function AppNav() {
  const { isSignedIn, account, logout } = useAuthSession();
  const router = useRouter();

  async function handleSignOut() {
    await logout();
    router.push("/login");
  }

  return (
    <nav className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-4">
        <NavLink href="/game-caro">Caro</NavLink>
      </div>

      <div className="flex items-center gap-3">
        {isSignedIn && account ? (
          <>
            <Avatar src={account.avatarUrl} alt={account.username} />
            <span className="text-sm font-medium">{account.username}</span>
            <Button onClick={handleSignOut}>Sign out</Button>
          </>
        ) : (
          <NavLink href="/login">Sign in</NavLink>
        )}
      </div>
    </nav>
  );
}
