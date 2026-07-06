import { JoinMatchButton } from "@/components/molecules/JoinMatchButton";

export default function GameCaroListPage() {
  // Placeholder list view (spec.md Assumptions — real content is a future feature). Renders for
  // anonymous visitors (FR-008); only the "join" action below is gated (FR-009).
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Caro Games</h1>
      <p className="text-gray-600">Coming soon.</p>
      <JoinMatchButton />
    </main>
  );
}
