import { GameCard } from "@/components/molecules/GameCard";
import { EmptyState } from "@/components/molecules/EmptyState";

export function GameGrid({
  games,
  emptyMessage,
}: {
  games: Array<{ name: string; bannerUrl: string; href: string }>;
  emptyMessage: string;
}) {
  if (games.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <GameCard key={game.href} name={game.name} bannerUrl={game.bannerUrl} href={game.href} />
      ))}
    </div>
  );
}
