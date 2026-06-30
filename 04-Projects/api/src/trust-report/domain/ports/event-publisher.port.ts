export const EVENT_PUBLISHER_PORT = 'EVENT_PUBLISHER_PORT';

export interface IEventPublisherPort {
  publishTrustScoreAlert(recipientId: string, content: string, referenceId?: string): Promise<void>;
}
