import { cookies } from "next/headers";
import { getLeaderboard, listGameConfigs, listLobbyMatches, listTournaments } from "@game-hub/caro-service";
import { ACCESS_COOKIE_NAME, ensureCaroServiceConfigured, getSessionStatus } from "@/lib/session";
import { GameDashboardTemplate } from "@/components/templates/GameDashboardTemplate";
import { LeaderboardPanel } from "@/components/organisms/LeaderboardPanel";
import { LobbyPanel } from "@/components/organisms/LobbyPanel";
import { TournamentPanel } from "@/components/organisms/TournamentPanel";
import { QuickPairPanel } from "@/components/organisms/QuickPairPanel";

// Real dashboard (spec.md User Story 1) — every read here renders for anonymous visitors too
// (FR-008); only the gated actions inside each card redirect a signed-out click to /login
// (FR-009, via RequireSignIn). Data is fetched here (server-only — packages/caro-service's http
// client requires BACKEND_URL and the request's own cookie, research.md §1) and handed down as
// plain props so the interactive panels below stay client-only where they need hooks (SSE,
// useAuthSession) without each one re-implementing auth/token plumbing.
export default async function GameCaroPage() {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  await ensureCaroServiceConfigured(accessToken);

  const [session, leaderboardResult, lobbyResult, gameConfigsResult, tournamentsResult] = await Promise.all([
    getSessionStatus(),
    getLeaderboard(),
    listLobbyMatches(),
    listGameConfigs(),
    listTournaments(),
  ]);

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Caro Games</h1>
      <div className="mt-6">
        <GameDashboardTemplate
          lobby={<LobbyPanel initialMatches={lobbyResult.ok ? lobbyResult.data : []} />}
          tournament={
            <TournamentPanel
              tournaments={tournamentsResult.ok ? tournamentsResult.data : []}
              gameConfigs={gameConfigsResult.ok ? gameConfigsResult.data : []}
            />
          }
          quickPair={<QuickPairPanel gameConfigs={gameConfigsResult.ok ? gameConfigsResult.data : null} />}
          leaderboard={
            <LeaderboardPanel
              entries={leaderboardResult.ok ? leaderboardResult.data : null}
              currentAccountId={session.account?.id ?? null}
            />
          }
        />
      </div>
    </main>
  );
}
