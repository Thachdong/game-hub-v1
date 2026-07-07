"use client";

import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps a gated action (join/chat/report/play, per FR-009). If the visitor is anonymous, clicking
 * prompts sign-in (redirects to /login with a callbackUrl back to this page) instead of invoking
 * the action. `authorized` (default `true`) additionally gates participant-only actions (spec
 * 008's Start/Request Draw/Surrender/move/viewer-kick, FR-013/FR-014/FR-016): a signed-in visitor
 * who isn't authorized (e.g. a spectator, not one of the match's two participants) is redirected
 * to login exactly like a guest, rather than having `onAction` invoked.
 */
export function RequireSignIn({
  onAction,
  authorized = true,
  children,
}: {
  onAction: () => void;
  authorized?: boolean;
  children: (props: { onClick: () => void }) => ReactNode;
}) {
  const { isSignedIn } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();

  function handleClick() {
    if (!isSignedIn || !authorized) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    onAction();
  }

  return <>{children({ onClick: handleClick })}</>;
}
