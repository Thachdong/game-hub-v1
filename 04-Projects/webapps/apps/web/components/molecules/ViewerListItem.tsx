"use client";

import { RequireSignIn } from "@/components/molecules/RequireSignIn";

/**
 * One spectator row in the viewer list, with a mute/kick control (FR-016) always visible per
 * FR-013 — a guest or signed-in non-participant spectator's click redirects to login instead of
 * muting (quickstart.md item 6); only a match participant's click actually mutes.
 */
export function ViewerListItem({
  username,
  isParticipant,
  onMute,
}: {
  username: string;
  isParticipant: boolean;
  onMute: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-sm text-[var(--color-text-primary)]">
      <span className="truncate">{username}</span>
      <RequireSignIn onAction={onMute} authorized={isParticipant}>
        {({ onClick }) => (
          <button
            type="button"
            onClick={onClick}
            className="shrink-0 text-xs text-[var(--color-text-secondary)] underline"
          >
            Mute
          </button>
        )}
      </RequireSignIn>
    </div>
  );
}
