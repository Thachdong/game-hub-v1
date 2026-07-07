import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";

// Generic placeholder avatar (a muted person silhouette in the fixed --color-text-secondary
// tone) used until the leaderboard endpoint returns a real avatarUrl (research.md §2 row 1).
const PLACEHOLDER_AVATAR_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23A3A3A3'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M4 20c0-4.4 3.6-6 8-6s8 1.6 8 6'/%3E%3C/svg%3E";

export function LeaderboardEntryRow({
  rank,
  displayName,
  avatarUrl,
  elo,
  highlight,
  isSelf,
}: {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  elo: number;
  highlight: "1st" | "2nd" | "3rd" | null;
  isSelf: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-6 text-sm text-[var(--color-text-secondary)]">{rank}</span>
      <Avatar src={avatarUrl ?? PLACEHOLDER_AVATAR_SRC} alt={displayName} />
      <span className="flex-1 truncate text-sm font-medium text-[var(--color-text-primary)]">{displayName}</span>
      {highlight ? <Badge variant={highlight} /> : null}
      {isSelf ? <Badge variant="you" /> : null}
      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{elo}</span>
    </div>
  );
}
