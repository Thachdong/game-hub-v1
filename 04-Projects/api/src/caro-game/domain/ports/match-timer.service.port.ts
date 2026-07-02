export const MATCH_TIMER_SERVICE_PORT = 'MATCH_TIMER_SERVICE_PORT';

export interface IMatchTimerServicePort {
  scheduleStartWindow(matchId: string, deadlineAt: Date, onExpire: () => Promise<void>): void;
  scheduleMoveTimer(matchId: string, deadlineAt: Date, onExpire: () => Promise<void>): void;
  cancelTimer(matchId: string): void;
}
