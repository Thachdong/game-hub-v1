import { Injectable } from '@nestjs/common';
import { RealtimeService } from '../../../realtime/realtime.service';
import { IRealtimePushPort } from '../../../realtime/realtime-push.port';

@Injectable()
export class RealtimePushAdapter implements IRealtimePushPort {
  constructor(private readonly realtimeService: RealtimeService) {}

  async pushToUser(userId: string, event: string, payload: unknown): Promise<void> {
    await this.realtimeService.pushToUser(userId, event, payload);
  }
}
