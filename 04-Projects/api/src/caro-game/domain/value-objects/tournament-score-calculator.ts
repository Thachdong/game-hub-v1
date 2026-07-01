export type MatchResult = 'win' | 'draw' | 'loss';

export interface ScoreCalculationResult {
  pointsAwarded: number;
  newStreak: number;
}

/**
 * Arena scoring formula (pure function — no imports, no side effects).
 *
 * WIN   → newStreak = currentStreak + 1
 *         if newStreak >= 4 (already had a streak ≥ 3): pointsAwarded = 4
 *         else: pointsAwarded = 2
 * DRAW  → if currentStreak >= 3: pointsAwarded = 2 (streak-break bonus), newStreak = 0
 *         else: pointsAwarded = 1, newStreak = 0
 * LOSS  → pointsAwarded = 0, newStreak = 0
 */
export function calculateTournamentScore(
  result: MatchResult,
  currentStreak: number,
): ScoreCalculationResult {
  if (result === 'loss') {
    return { pointsAwarded: 0, newStreak: 0 };
  }

  if (result === 'draw') {
    const pointsAwarded = currentStreak >= 3 ? 2 : 1;
    return { pointsAwarded, newStreak: 0 };
  }

  // result === 'win'
  const newStreak = currentStreak + 1;
  const pointsAwarded = newStreak >= 4 ? 4 : 2;
  return { pointsAwarded, newStreak };
}
