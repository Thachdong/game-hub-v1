"use client";

import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps a gated action (join/chat/report/play, per FR-009). If the visitor is anonymous, clicking
 * prompts sign-in (redirects to /login with a callbackUrl back to this page) instead of invoking
 * the action.
 */
export function RequireSignIn({
  onAction,
  children,
}: {
  onAction: () => void;
  children: (props: { onClick: () => void }) => ReactNode;
}) {
  const { isSignedIn } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();

  function handleClick() {
    if (!isSignedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    onAction();
  }

  return <>{children({ onClick: handleClick })}</>;
}
