"use client";

import { Button } from "@/components/atoms/Button";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";

// Placeholder actions — real chat/report/play logic ships with the future game-caro content
// feature. Each is gated per FR-009: anonymous visitors are prompted to sign in instead of the
// action silently failing.
export function MatchActionButtons() {
  return (
    <div className="flex gap-2">
      <RequireSignIn onAction={() => {}}>
        {({ onClick }) => <Button onClick={onClick}>Chat</Button>}
      </RequireSignIn>
      <RequireSignIn onAction={() => {}}>
        {({ onClick }) => <Button onClick={onClick}>Report</Button>}
      </RequireSignIn>
      <RequireSignIn onAction={() => {}}>
        {({ onClick }) => <Button onClick={onClick}>Play</Button>}
      </RequireSignIn>
    </div>
  );
}
