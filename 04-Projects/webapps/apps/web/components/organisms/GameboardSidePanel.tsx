import type { MatchState } from "@game-hub/caro-service";

/** The four right-column layouts spec.md describes (data-model.md "GameboardViewState"). */
export type GameboardViewState = 1 | 2 | 3 | 4;

export function deriveViewState(status: string): GameboardViewState {
  switch (status) {
    case "looking_for_opponent":
      return 1;
    case "waiting_for_start":
      return 2;
    case "in_progress":
      return 3;
    case "completed":
    case "cancelled":
      return 4;
    default:
      return 1;
  }
}

/**
 * Dispatches to one of the four per-state right-column layouts based on `match.status`
 * (FR-003/FR-004/FR-007/FR-008). Stubbed branches here; wired to real content in US1 (T043).
 */
export function GameboardSidePanel({ match }: { match: MatchState }) {
  const viewState = deriveViewState(match.status);

  switch (viewState) {
    case 1:
      return <div data-testid="gameboard-state-1">Waiting for opponent</div>;
    case 2:
      return <div data-testid="gameboard-state-2">Pre-start countdown</div>;
    case 3:
      return <div data-testid="gameboard-state-3">In progress</div>;
    case 4:
      return <div data-testid="gameboard-state-4">Match ended</div>;
  }
}
