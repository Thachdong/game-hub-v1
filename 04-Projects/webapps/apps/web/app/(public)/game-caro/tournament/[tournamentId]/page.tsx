export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  // Minimal read-only detail view satisfying FR-012's "View" action — full detail content
  // (participants, chat) is out of scope pending the tournament read-shape gap (research.md §2
  // row 6). Renders for anonymous visitors same as the dashboard itself (FR-008).
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
        Tournament {tournamentId}
      </h1>
      <p className="text-[var(--color-text-secondary)]">Full detail view coming soon.</p>
    </main>
  );
}
