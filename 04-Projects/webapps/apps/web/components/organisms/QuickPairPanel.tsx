import { EmptyState } from "@/components/molecules/EmptyState";
import { QuickPairCard } from "@/components/molecules/QuickPairCard";
import type { GameConfig } from "@game-hub/caro-service";

/**
 * `gameConfigs: null` means the call 401'd (research.md §2 row 4 — guarded on the backend today
 * for a guest); renders a guest-safe fallback instead of an error.
 */
export function QuickPairPanel({ gameConfigs }: { gameConfigs: GameConfig[] | null }) {
  if (gameConfigs === null) {
    return <EmptyState message="Quick Pair is only available to signed-in players right now" />;
  }

  if (gameConfigs.length === 0) {
    return <EmptyState message="No game types available" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {gameConfigs.map((config) => (
        <QuickPairCard
          key={config.id}
          configId={config.id}
          boardSize={config.boardSize}
          moveTimeSeconds={config.moveTimeSeconds}
        />
      ))}
    </div>
  );
}
