import { cookies } from "next/headers";
import { getCurrentAccount, listGames } from "@game-hub/account-service";
import { ACCESS_COOKIE_NAME, ensureAccountServiceConfigured } from "@/lib/session";
import { getGameLinkTarget } from "@/lib/game-routes";
import { Avatar } from "@/components/atoms/Avatar";
import { GameGrid } from "@/components/organisms/GameGrid";

export default async function AccountPage() {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE_NAME)?.value ?? null;
  await ensureAccountServiceConfigured(accessToken);

  const [accountResult, gamesResult] = await Promise.all([getCurrentAccount(), listGames()]);
  const account = accountResult.ok ? accountResult.data : null;
  const playedGames = gamesResult.ok ? gamesResult.data.filter((game) => game.hasProfile === true) : [];

  return (
    <main className="p-8">
      {account ? (
        <div className="flex items-center gap-4">
          <Avatar src={account.avatarUrl} alt={account.username} />
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">{account.username}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">{account.email}</p>
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Profiles</h2>
        <div className="mt-4">
          <GameGrid
            games={playedGames.map((game) => ({
              name: game.name,
              bannerUrl: game.bannerUrl,
              href: getGameLinkTarget(game).profilePath,
            }))}
            emptyMessage="No profile yet"
          />
        </div>
      </section>
    </main>
  );
}
