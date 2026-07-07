import { EmptyState } from "@/components/molecules/EmptyState";
import { LeaderboardEntryRow } from "@/components/molecules/LeaderboardEntryRow";
import type { LeaderboardEntry } from "@game-hub/caro-service";

function highlightFor(rank: number): "1st" | "2nd" | "3rd" | null {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return null;
}

/**
 * `entries: null` means the call 401'd (research.md §2 row 2 — guarded on the backend today for
 * a guest); renders a guest-safe fallback instead of an error.
 */
export function LeaderboardPanel({
  entries,
  currentAccountId,
}: {
  entries: LeaderboardEntry[] | null;
  currentAccountId: string | null;
}) {
  if (entries === null) {
    return <EmptyState message="Leaderboard is only available to signed-in players right now" />;
  }

  const topTen = entries.slice(0, 10);

  if (topTen.length === 0) {
    return <EmptyState message="No ranked players yet" />;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Leaderboard</h2>
      <div className="mt-4 divide-y divide-[var(--color-border)]">
        {topTen.map((entry) => (
          <LeaderboardEntryRow
            key={entry.playerId}
            rank={entry.rank}
            displayName={`Player ${entry.playerId.slice(0, 6)}`}
            avatarUrl={null}
            elo={entry.elo}
            highlight={highlightFor(entry.rank)}
            isSelf={entry.playerId === currentAccountId}
          />
        ))}
      </div>
    </section>
  );
}
