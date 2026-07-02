import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IEventPublisherPort } from '../../domain/ports/event-publisher.port';

@Injectable()
export class TrustReportEventPublisherAdapter implements IEventPublisherPort {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publishTrustScoreAlert(
    recipientId: string,
    content: string,
    referenceId?: string,
  ): Promise<void> {
    this.eventEmitter.emit('notification.trust-score-alert', {
      recipientId,
      content,
      referenceId,
    });
  }
}
