import type { TournamentStanding } from "@game-hub/caro-service";
import { EmptyState } from "@/components/molecules/EmptyState";
import { TournamentStandingRow } from "@/components/molecules/TournamentStandingRow";
import { Pagination } from "@/components/molecules/Pagination";

/** Paginated, score-descending standings list (FR-002/FR-003). */
export function TournamentStandingsList({
  standings,
  page,
  pageSize,
  total,
  currentPlayerId,
  onPageChange,
}: {
  standings: TournamentStanding[];
  page: number;
  pageSize: number;
  total: number;
  currentPlayerId: string | null;
  onPageChange: (page: number) => void;
}) {
  if (standings.length === 0) {
    return <EmptyState message="No participants registered yet" />;
  }

  return (
    <div className="flex flex-col rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
      {standings.map((standing) => (
        <TournamentStandingRow
          key={standing.registrationId}
          standing={standing}
          isSelf={standing.playerId === currentPlayerId}
        />
      ))}
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
    </div>
  );
}
