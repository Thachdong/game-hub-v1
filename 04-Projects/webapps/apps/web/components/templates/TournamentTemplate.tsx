import type { ReactNode } from "react";

/** Countdown (+ pause control, when signed in) header above the standings list (FR-001/FR-004). */
export function TournamentTemplate({ header, standings }: { header: ReactNode; standings: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">{header}</div>
      <div>{standings}</div>
    </div>
  );
}
