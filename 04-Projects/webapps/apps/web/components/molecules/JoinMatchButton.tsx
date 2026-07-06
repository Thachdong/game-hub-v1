"use client";

import { Button } from "@/components/atoms/Button";
import { RequireSignIn } from "@/components/molecules/RequireSignIn";

export function JoinMatchButton() {
  function handleJoin() {
    // Placeholder — real join logic ships with the future game-caro content feature.
  }

  return (
    <RequireSignIn onAction={handleJoin}>
      {({ onClick }) => <Button onClick={onClick}>Join</Button>}
    </RequireSignIn>
  );
}
