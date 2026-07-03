"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps a gated action (join/chat/report/play, per FR-009). If the visitor is anonymous — or
 * their session has `error: "RefreshFailed"` (FR-004, same treatment as AppNav/(protected)/layout) —
 * clicking prompts sign-in (redirects to /login with a callbackUrl back to this page) instead of
 * invoking the action.
 */
export function RequireSignIn({
  onAction,
  children,
}: {
  onAction: () => void;
  children: (props: { onClick: () => void }) => ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isSignedIn = status === "authenticated" && !session?.error;

  function handleClick() {
    if (!isSignedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    onAction();
  }

  return <>{children({ onClick: handleClick })}</>;
}
