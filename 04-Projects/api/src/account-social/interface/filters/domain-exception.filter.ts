import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  DomainError,
  AccountNotFoundError,
  SelfFriendRequestError,
  FriendRequestDuplicateError,
  AlreadyFriendsError,
  FriendRequestNotFoundError,
  GameNotFoundError,
  GameAdminRoleNotFoundError,
  ForbiddenDomainError,
  GoogleOAuthUnavailableError,
} from '@domain/errors';
import {
  NotificationNotFoundError,
  ForbiddenNotificationError,
  InvalidNotificationTypeError,
  InvalidNotificationContentError,
  InvalidRecipientError,
} from '../../../notification/domain/errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DOMAIN_ERROR_MAP = new Map<new (...args: any[]) => DomainError, [HttpStatus, string]>([
  [AccountNotFoundError, [HttpStatus.NOT_FOUND, 'ACCOUNT_NOT_FOUND']],
  [SelfFriendRequestError, [HttpStatus.BAD_REQUEST, 'FRIEND_REQUEST_SELF']],
  [FriendRequestDuplicateError, [HttpStatus.CONFLICT, 'FRIEND_REQUEST_DUPLICATE']],
  [AlreadyFriendsError, [HttpStatus.CONFLICT, 'ALREADY_FRIENDS']],
  [FriendRequestNotFoundError, [HttpStatus.NOT_FOUND, 'NOT_FOUND']],
  [GameNotFoundError, [HttpStatus.NOT_FOUND, 'GAME_NOT_FOUND']],
  [GameAdminRoleNotFoundError, [HttpStatus.NOT_FOUND, 'GAME_ADMIN_ROLE_NOT_FOUND']],
  [ForbiddenDomainError, [HttpStatus.FORBIDDEN, 'FORBIDDEN']],
  [GoogleOAuthUnavailableError, [HttpStatus.SERVICE_UNAVAILABLE, 'GOOGLE_OAUTH_UNAVAILABLE']],
  // Notification domain errors
  [NotificationNotFoundError, [HttpStatus.NOT_FOUND, 'NOTIFICATION_NOT_FOUND']],
  [ForbiddenNotificationError, [HttpStatus.FORBIDDEN, 'NOTIFICATION_FORBIDDEN']],
  [InvalidNotificationTypeError, [HttpStatus.UNPROCESSABLE_ENTITY, 'NOTIFICATION_INVALID_TYPE']],
  [InvalidNotificationContentError, [HttpStatus.UNPROCESSABLE_ENTITY, 'NOTIFICATION_EMPTY_CONTENT']],
  [InvalidRecipientError, [HttpStatus.UNPROCESSABLE_ENTITY, 'NOTIFICATION_INVALID_RECIPIENT']],
]);

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const mapping = DOMAIN_ERROR_MAP.get(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exception.constructor as new (...args: any[]) => DomainError,
    );

    const [status, code] = mapping ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR'];

    response.status(status).json({ code, message: exception.message });
  }
}
