import type { TournamentStanding } from "@game-hub/caro-service";

/**
 * One row of the standings list (FR-002/FR-004). The participants endpoint doesn't join a
 * username (contracts/tournament-endpoints-addendum.md's response has no such field) — displayed
 * identity falls back to a shortened playerId, matching GameboardSidePanel's existing
 * `Player {id.slice(0,6)}` fallback convention for the same gap.
 */
export function TournamentStandingRow({
  standing,
  isSelf,
}: {
  standing: TournamentStanding;
  isSelf: boolean;
}) {
  return (
    <div
      data-testid={`standing-row-${standing.registrationId}`}
      className={`flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2 last:border-b-0 ${
        isSelf ? "bg-[var(--color-surface)]" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-8 text-sm font-medium text-[var(--color-text-secondary)]">
          #{standing.rank}
        </span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          Player {standing.playerId.slice(0, 6)}
        </span>
        {standing.isPaused ? (
          <span className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
            Paused
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
        <span>{standing.tournamentPoints} pts</span>
        <span>Streak {standing.winStreak}</span>
      </div>
    </div>
  );
}
