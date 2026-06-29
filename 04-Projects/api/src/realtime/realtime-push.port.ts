export interface IRealtimePushPort {
  pushToUser(userId: string, event: string, payload: unknown): Promise<void>;
}

export const REALTIME_PUSH_PORT = Symbol('IRealtimePushPort');
