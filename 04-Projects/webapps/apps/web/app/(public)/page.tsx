import { cookies } from "next/headers";
import { listGames } from "@game-hub/account-service";
import { ACCESS_COOKIE_NAME, ensureAccountServiceConfigured } from "@/lib/session";
import { getGameLinkTarget } from "@/lib/game-routes";
import { GameGrid } from "@/components/organisms/GameGrid";

export default async function GamesListPage() {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  await ensureAccountServiceConfigured(accessToken);

  const result = await listGames();
  const games = result.ok ? result.data : [];

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Games</h1>
      <div className="mt-6">
        <GameGrid
          games={games.map((game) => ({
            name: game.name,
            bannerUrl: game.bannerUrl,
            href: getGameLinkTarget(game).entryPath,
          }))}
          emptyMessage="No games available"
        />
      </div>
    </main>
  );
}
