import { DomainError } from '../../../account-social/domain/errors';

export class NotificationNotFoundError extends DomainError {
  constructor() {
    super('NOTIFICATION_NOT_FOUND', 'No notification found with the given ID.');
  }
}

export class ForbiddenNotificationError extends DomainError {
  constructor() {
    super('NOTIFICATION_FORBIDDEN', 'You do not have permission to access this notification.');
  }
}

export class InvalidNotificationTypeError extends DomainError {
  constructor(type: string) {
    super('NOTIFICATION_INVALID_TYPE', `Notification type "${type}" is not recognized.`);
  }
}

export class InvalidNotificationContentError extends DomainError {
  constructor() {
    super('NOTIFICATION_EMPTY_CONTENT', 'Notification content must not be empty.');
  }
}

export class InvalidRecipientError extends DomainError {
  constructor(recipientId: string) {
    super(
      'NOTIFICATION_INVALID_RECIPIENT',
      `No account found with ID "${recipientId}".`,
    );
  }
}
