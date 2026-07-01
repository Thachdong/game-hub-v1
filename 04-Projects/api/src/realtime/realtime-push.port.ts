export interface IRealtimePushPort {
  pushToUser(userId: string, event: string, payload: unknown): Promise<void>;
}

export const REALTIME_PUSH_PORT = Symbol('IRealtimePushPort');

export interface IRealtimeRoomPort {
  joinRoom(socketId: string, room: string): Promise<void>;
  leaveRoom(socketId: string, room: string): Promise<void>;
  pushToRoom(room: string, event: string, payload: unknown): Promise<void>;
}

export const REALTIME_ROOM_PORT = Symbol('IRealtimeRoomPort');
