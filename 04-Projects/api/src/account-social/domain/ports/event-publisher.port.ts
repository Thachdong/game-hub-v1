export interface IEventPublisherPort {
  publish(eventName: string, event: object): Promise<void>;
}

export const EVENT_PUBLISHER_PORT = Symbol('EVENT_PUBLISHER_PORT');
