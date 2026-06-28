import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IEventPublisherPort } from '../../domain/ports/event-publisher.port';

@Injectable()
export class EventPublisherAdapter implements IEventPublisherPort {
  constructor(private readonly emitter: EventEmitter2) {}

  async publish(eventName: string, event: object): Promise<void> {
    this.emitter.emit(eventName, event);
  }
}
