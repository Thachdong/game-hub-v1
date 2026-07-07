/** Static state-1 placeholder shown in place of the opponent's PlayerCard until a second player joins. */
export function WaitingForOpponentCard() {
  return (
    <div className="flex items-center justify-center rounded border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-secondary)]">
      Waiting for opponent…
    </div>
  );
}
