import { GameDashboardTemplate } from "@/components/templates/GameDashboardTemplate";

// Real dashboard shell (spec.md) — panel content for each tab and the leaderboard is filled in by
// User Story 1; this Foundational-phase version just proves the shell renders (research.md, plan.md).
export default function GameCaroPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Caro Games</h1>
      <div className="mt-6">
        <GameDashboardTemplate lobby={<div />} tournament={<div />} quickPair={<div />} leaderboard={<div />} />
      </div>
    </main>
  );
}
