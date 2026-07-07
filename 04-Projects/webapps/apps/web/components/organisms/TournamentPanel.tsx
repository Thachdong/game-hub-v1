import { EmptyState } from "@/components/molecules/EmptyState";
import { TournamentCard } from "@/components/molecules/TournamentCard";
import { formatGameType } from "@/lib/gameType";
import type { GameConfig } from "@game-hub/caro-service";

// The tournament response shape is unconfirmed against the live backend (data-model.md
// "TournamentCardView", research.md §2 row 6) — every field below is read defensively rather than
// assumed present.
interface RawTournament {
  id?: string;
  title?: string;
  gameConfigId?: string;
  minElo?: number;
  startAt?: string;
  registeredCount?: number;
}

function isRawTournament(value: unknown): value is RawTournament {
  return typeof value === "object" && value !== null;
}

export function TournamentPanel({
  tournaments,
  gameConfigs,
}: {
  tournaments: unknown[];
  gameConfigs: GameConfig[];
}) {
  const configById = new Map(gameConfigs.map((config) => [config.id, config]));

  const cards = tournaments.filter(isRawTournament).map((tournament, index) => {
    const config = tournament.gameConfigId ? configById.get(tournament.gameConfigId) : undefined;
    const gameType = config ? formatGameType(config.boardSize, config.moveTimeSeconds) : "Unknown game type";
    const title =
      tournament.title ??
      `${gameType} Tournament${tournament.minElo !== undefined ? ` · min Elo ${tournament.minElo}` : ""}`;

    return {
      id: tournament.id ?? String(index),
      title,
      gameType,
      startAt: tournament.startAt ?? new Date(0).toISOString(),
      registeredCount: tournament.registeredCount ?? 0,
    };
  });

  if (cards.length === 0) {
    return <EmptyState message="No upcoming tournaments" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <TournamentCard key={card.id} {...card} />
      ))}
    </div>
  );
}
