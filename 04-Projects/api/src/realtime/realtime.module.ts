import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { REALTIME_PUSH_PORT, REALTIME_ROOM_PORT } from './realtime-push.port';

@Module({
  providers: [
    RealtimeGateway,
    RealtimeService,
    { provide: REALTIME_PUSH_PORT, useExisting: RealtimeService },
    { provide: REALTIME_ROOM_PORT, useExisting: RealtimeService },
  ],
  exports: [RealtimeService, REALTIME_PUSH_PORT, REALTIME_ROOM_PORT],
})
export class RealtimeModule {}
