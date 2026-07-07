import { cookies } from "next/headers";
import { getMatch } from "@game-hub/caro-service";
import { ACCESS_COOKIE_NAME, ensureCaroServiceConfigured } from "@/lib/session";
import { ErrorMessage } from "@/components/atoms/ErrorMessage";
import { GameboardContainer } from "@/components/organisms/GameboardContainer";

// Real gameboard (spec 008). Every read here renders for anonymous visitors too (FR-012); only
// the gated actions inside GameboardSidePanel's branches redirect a signed-out/ineligible click
// to /login (FR-013/FR-014/FR-015/FR-016). Live match/viewer/replay state is owned by
// GameboardContainer (a Client Component) since this Server Component can't hold React state or
// realtime subscriptions itself.
export default async function GameCaroDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  await ensureCaroServiceConfigured(accessToken);

  const result = await getMatch({ id: matchId });

  if (!result.ok) {
    return (
      <main className="p-8">
        <ErrorMessage>Match not found.</ErrorMessage>
      </main>
    );
  }

  return (
    <main className="p-8">
      <GameboardContainer initialMatch={result.data} />
    </main>
  );
}
