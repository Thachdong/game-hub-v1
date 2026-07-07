/** Own/opponent player card (data-model.md "OwnPlayerCardView / OpponentPlayerCardView"). */
export function PlayerCard({
  id,
  username,
  elo,
  winRate,
  isSelf,
  isCurrentTurn,
  isCreator,
}: {
  id: string;
  username: string;
  elo: number;
  winRate: number;
  isSelf: boolean;
  isCurrentTurn: boolean;
  isCreator: boolean;
}) {
  // Backend placeholder for an unresolved username is the raw id (research.md §3 row 1).
  const displayName = username === id ? `Player ${id.slice(0, 6)}` : username;

  return (
    <div className="flex items-center justify-between gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium text-[var(--color-text-primary)]">
          {displayName}
          {isSelf ? " (You)" : ""}
        </span>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-secondary)]">
          {elo !== 0 ? <span>{elo} Elo</span> : null}
          {winRate !== 0 ? <span>{Math.round(winRate * 100)}% win rate</span> : null}
          {isCreator ? <span>Creator</span> : null}
        </div>
      </div>
      {isCurrentTurn ? (
        <span className="shrink-0 text-xs font-semibold text-[var(--color-accent)]">Current turn</span>
      ) : null}
    </div>
  );
}
