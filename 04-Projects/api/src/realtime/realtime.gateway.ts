import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthConfig } from '@config/auth.config';

interface HandshakeWithAuth {
  auth?: { token?: string };
}

type SocketRole = 'authenticated' | 'observer';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role: SocketRole;
}

@WebSocketGateway({ path: '/realtime', cors: true })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly connections = new Map<string, Set<AuthenticatedSocket>>();
  /** room → set of authenticated viewer usernames currently in the room */
  private readonly roomViewers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: AuthenticatedSocket): void {
    const handshake = client.handshake as unknown as HandshakeWithAuth;
    const token = handshake?.auth?.token;

    if (!token) {
      // Allow unauthenticated guests as read-only observers
      client.role = 'observer';
      return;
    }

    try {
      const auth = this.configService.get<AuthConfig>('auth')!;
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: auth.jwtAccessSecret,
      });
      client.userId = payload.sub;
      client.role = 'authenticated';

      if (!this.connections.has(client.userId)) {
        this.connections.set(client.userId, new Set());
      }
      this.connections.get(client.userId)!.add(client);
    } catch {
      // Invalid token → treat as observer
      client.role = 'observer';
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.userId) {
      const sockets = this.connections.get(client.userId);
      if (sockets) {
        sockets.delete(client);
        if (sockets.size === 0) {
          this.connections.delete(client.userId);
        }
      }
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string; matchViewerUsername?: string },
  ): Promise<void> {
    const { room } = data;
    await client.join(room);

    // Track authenticated viewers in match rooms
    if (room.startsWith('match:') && client.role === 'authenticated' && data.matchViewerUsername) {
      if (!this.roomViewers.has(room)) this.roomViewers.set(room, new Set());
      const viewers = this.roomViewers.get(room)!;
      if (!viewers.has(data.matchViewerUsername)) {
        viewers.add(data.matchViewerUsername);
        this.server.to(room).emit('match:viewer_joined', {
          matchId: room.replace('match:', ''),
          viewerId: client.userId,
          viewerUsername: data.matchViewerUsername,
        });
      }
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string; matchViewerUsername?: string },
  ): Promise<void> {
    const { room } = data;
    await client.leave(room);

    if (room.startsWith('match:') && data.matchViewerUsername) {
      const viewers = this.roomViewers.get(room);
      if (viewers) {
        viewers.delete(data.matchViewerUsername);
        this.server.to(room).emit('match:viewer_left', {
          matchId: room.replace('match:', ''),
          viewerId: client.userId,
          viewerUsername: data.matchViewerUsername,
        });
      }
    }
  }

  getViewersInRoom(room: string): string[] {
    return Array.from(this.roomViewers.get(room) ?? []);
  }

  clearRoomViewers(room: string): void {
    this.roomViewers.delete(room);
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

  async joinRoom(socketId: string, room: string): Promise<void> {
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) await socket.join(room);
  }

  async leaveRoom(socketId: string, room: string): Promise<void> {
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) await socket.leave(room);
  }

  pushToRoom(room: string, event: string, payload: unknown): void {
    this.server.to(room).emit(event, payload);
  }
}
