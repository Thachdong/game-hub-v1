import type { Game } from "@game-hub/account-service";

export interface GameLinkTarget {
  entryPath: string;
  profilePath: string;
}

/** Derives a game's entry/profile routes from its slug (research.md §1). */
export function getGameLinkTarget(game: Pick<Game, "slug">): GameLinkTarget {
  const entryPath = `/game-${game.slug}`;
  return { entryPath, profilePath: `${entryPath}/profile` };
}
