import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  async pushToUser(userId: string, event: string, payload: unknown): Promise<void> {
    try {
      this.gateway.pushToUser(userId, event, payload);
    } catch (err) {
      this.logger.error(`pushToUser failed for user ${userId}, event ${event}: ${err}`);
    }
  }
}
