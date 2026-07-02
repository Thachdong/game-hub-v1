import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { IRealtimePushPort, IRealtimeRoomPort } from './realtime-push.port';

@Injectable()
export class RealtimeService implements IRealtimePushPort, IRealtimeRoomPort {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  async pushToUser(userId: string, event: string, payload: unknown): Promise<void> {
    try {
      this.gateway.pushToUser(userId, event, payload);
    } catch (err) {
      this.logger.error(`pushToUser failed for user ${userId}, event ${event}: ${err}`);
    }
  }

  async joinRoom(socketId: string, room: string): Promise<void> {
    await this.gateway.joinRoom(socketId, room);
  }

  async leaveRoom(socketId: string, room: string): Promise<void> {
    await this.gateway.leaveRoom(socketId, room);
  }

  async pushToRoom(room: string, event: string, payload: unknown): Promise<void> {
    try {
      this.gateway.pushToRoom(room, event, payload);
    } catch (err) {
      this.logger.error(`pushToRoom failed for room ${room}, event ${event}: ${err}`);
    }
  }

  getViewersInRoom(room: string): string[] {
    return this.gateway.getViewersInRoom(room);
  }

  clearRoomViewers(room: string): void {
    this.gateway.clearRoomViewers(room);
  }
}
