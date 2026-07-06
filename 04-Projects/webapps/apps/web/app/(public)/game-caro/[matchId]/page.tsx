import { MatchActionButtons } from "@/components/molecules/MatchActionButtons";

export default async function GameCaroDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  // Placeholder detail view (spec.md Assumptions — real content is a future feature). Renders for
  // anonymous visitors (FR-008); only chat/report/play actions below are gated (FR-009).
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Match {matchId}</h1>
      <p className="text-gray-600">Coming soon.</p>
      <MatchActionButtons />
    </main>
  );
}
