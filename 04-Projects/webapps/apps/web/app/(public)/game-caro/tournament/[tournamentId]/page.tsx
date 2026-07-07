import { cookies } from "next/headers";
import { getTournament, listTournamentParticipants } from "@game-hub/caro-service";
import { ACCESS_COOKIE_NAME, ensureCaroServiceConfigured, getSessionStatus } from "@/lib/session";
import { ErrorMessage } from "@/components/atoms/ErrorMessage";
import { TournamentContainer } from "@/components/organisms/TournamentContainer";

// Real tournament page (spec 009). Every read here renders for anonymous visitors too
// (FR-001/FR-002/FR-012); only the Pause control (added by US4) is gated behind sign-in. Live
// countdown/standings state is owned by TournamentContainer (a Client Component) since this
// Server Component can't hold React state or realtime subscriptions itself.
export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  await ensureCaroServiceConfigured(accessToken);

  const [tournamentResult, standingsResult, session] = await Promise.all([
    getTournament({ tournamentId }),
    listTournamentParticipants({ tournamentId, page: 1, pageSize: 20 }),
    getSessionStatus(),
  ]);

  if (!tournamentResult.ok || !standingsResult.ok) {
    return (
      <main className="p-8">
        <ErrorMessage>Tournament not found.</ErrorMessage>
      </main>
    );
  }

  return (
    <main className="p-8">
      <TournamentContainer
        initialTournament={tournamentResult.data}
        initialStandings={standingsResult.data}
        currentPlayerId={session.account?.id ?? null}
      />
    </main>
  );
}
