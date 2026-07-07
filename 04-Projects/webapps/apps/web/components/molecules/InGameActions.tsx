"use client";

import { Button } from "@/components/atoms/Button";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";
import { useAuthSession } from "@/components/templates/Providers";

/**
 * Request Draw / Surrender controls, or the accept/decline variant when a pending draw request
 * targets this viewer specifically (FR-007, data-model.md "InGameActionsView"). Guests and
 * non-participant spectators always see the plain Request Draw/Surrender pair, gated so a click
 * redirects to login instead of acting (FR-013/FR-014).
 */
export function InGameActions({
  playerXId,
  playerOId,
  pendingDrawRequestFromId,
  onRequestDraw,
  onSurrender,
  onRespondToDraw,
}: {
  playerXId: string | null;
  playerOId: string | null;
  pendingDrawRequestFromId: string | null;
  onRequestDraw: () => void;
  onSurrender: () => void;
  onRespondToDraw: (action: "accept" | "decline") => void;
}) {
  const { account } = useAuthSession();
  const isParticipant = account != null && (account.id === playerXId || account.id === playerOId);
  const isRequester = isParticipant && pendingDrawRequestFromId === account?.id;
  const isRecipientOfDrawRequest =
    isParticipant && pendingDrawRequestFromId !== null && pendingDrawRequestFromId !== account?.id;

  if (isRecipientOfDrawRequest) {
    return (
      <div className="flex gap-2">
        <RequireSignIn onAction={() => onRespondToDraw("accept")} authorized={isParticipant}>
          {({ onClick }) => (
            <Button type="button" onClick={onClick}>
              Accept Draw
            </Button>
          )}
        </RequireSignIn>
        <RequireSignIn onAction={() => onRespondToDraw("decline")} authorized={isParticipant}>
          {({ onClick }) => (
            <Button type="button" onClick={onClick}>
              Decline Draw
            </Button>
          )}
        </RequireSignIn>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <RequireSignIn onAction={onRequestDraw} authorized={isParticipant}>
        {({ onClick }) => (
          <Button type="button" onClick={onClick} disabled={isRequester}>
            {isRequester ? "Draw requested" : "Request Draw"}
          </Button>
        )}
      </RequireSignIn>
      <RequireSignIn onAction={onSurrender} authorized={isParticipant}>
        {({ onClick }) => (
          <Button type="button" onClick={onClick}>
            Surrender
          </Button>
        )}
      </RequireSignIn>
    </div>
  );
}
