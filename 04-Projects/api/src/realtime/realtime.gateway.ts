import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { AuthConfig } from '@config/auth.config';

interface HandshakeWithAuth {
  auth?: { token?: string };
}

@WebSocketGateway({ path: '/realtime', cors: true })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connections = new Map<string, Set<Socket>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const handshake = client.handshake as unknown as HandshakeWithAuth;
    const token = handshake?.auth?.token;

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const auth = this.configService.get<AuthConfig>('auth')!;
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: auth.jwtAccessSecret,
      });
      const userId = payload.sub;
      (client as Socket & { userId?: string }).userId = userId;

      if (!this.connections.has(userId)) {
        this.connections.set(userId, new Set());
      }
      this.connections.get(userId)!.add(client);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client as Socket & { userId?: string }).userId;
    if (!userId) return;

    const sockets = this.connections.get(userId);
    if (sockets) {
      sockets.delete(client);
      if (sockets.size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  pushToUser(userId: string, event: string, payload: unknown): void {
    const sockets = this.connections.get(userId);
    if (!sockets || sockets.size === 0) return;

    for (const socket of sockets) {
      try {
        socket.emit(event, payload);
      } catch (err) {
        this.logger.error(`Failed to push event "${event}" to user ${userId}: ${err}`);
      }
    }
  }
}
