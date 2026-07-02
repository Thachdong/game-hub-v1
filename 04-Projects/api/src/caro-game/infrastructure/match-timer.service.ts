import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { IMatchTimerServicePort } from '../domain/ports/match-timer.service.port';

@Injectable()
export class MatchTimerService implements IMatchTimerServicePort, OnModuleDestroy {
  private readonly logger = new Logger(MatchTimerService.name);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  scheduleStartWindow(matchId: string, deadlineAt: Date, onExpire: () => Promise<void>): void {
    this.cancelTimer(matchId);
    const delay = deadlineAt.getTime() - Date.now();
    if (delay <= 0) {
      onExpire().catch((err) => this.logger.error(`Start window callback error [${matchId}]: ${err}`));
      return;
    }
    const handle = setTimeout(() => {
      this.timers.delete(matchId);
      onExpire().catch((err) => this.logger.error(`Start window callback error [${matchId}]: ${err}`));
    }, delay);
    this.timers.set(matchId, handle);
  }

  scheduleMoveTimer(matchId: string, deadlineAt: Date, onExpire: () => Promise<void>): void {
    this.cancelTimer(matchId);
    const delay = deadlineAt.getTime() - Date.now();
    if (delay <= 0) {
      onExpire().catch((err) => this.logger.error(`Move timer callback error [${matchId}]: ${err}`));
      return;
    }
    const handle = setTimeout(() => {
      this.timers.delete(matchId);
      onExpire().catch((err) => this.logger.error(`Move timer callback error [${matchId}]: ${err}`));
    }, delay);
    this.timers.set(matchId, handle);
  }

  cancelTimer(matchId: string): void {
    const handle = this.timers.get(matchId);
    if (handle !== undefined) {
      clearTimeout(handle);
      this.timers.delete(matchId);
    }
  }

  onModuleDestroy(): void {
    for (const handle of this.timers.values()) {
      clearTimeout(handle);
    }
    this.timers.clear();
  }
}
