import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
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
} from '../../notification/domain/errors';
import {
  SelfReportError,
  ReportTypeNotFoundError,
  ReportTypeInactiveError,
  ReportNotFoundError,
  ReportAlreadyResolvedError,
  ReportTypeNameTakenError,
  EmptyUpdateError,
  InvalidDeductionPointsError,
} from '../../trust-report/domain/errors';
import {
  GameConfigNotFoundError,
  GameConfigDuplicateError,
  GameConfigInvalidBoardSizeError,
  GameConfigInvalidMoveTimeError,
  MatchNotFoundError,
  PlayerAlreadyInActiveStateError,
  NotAParticipantError,
  MatchNotInExpectedStatusError,
  NotMatchCreatorError,
  NotYourTurnError,
  CellAlreadyOccupiedError,
  CellOutOfBoundsError,
  DrawRequestAlreadyPendingError,
  NoDrawRequestPendingError,
  ViewerMutedError,
  NoActiveQuickPairRequestError,
  NotFriendsError,
  MatchPrivateAccessDeniedError,
  MoveDeadlineExpiredError,
  // Tournament errors
  TournamentNotFoundError,
  TournamentAlreadyStartedError,
  TournamentRegistrationClosedError,
  InsufficientEloError,
  AlreadyRegisteredError,
  NotRegisteredError,
  TournamentCreatorRoleAlreadyExistsError,
  PendingRequestAlreadyExistsError,
  TournamentCreatorRequestNotFoundError,
  TournamentCreatorRequestNotPendingError,
  PlayerProfileNotFoundError,
} from '../../caro-game/domain/errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DOMAIN_ERROR_STATUS = new Map<new (...args: any[]) => Error, HttpStatus>([
  [AccountNotFoundError, HttpStatus.NOT_FOUND],
  [SelfFriendRequestError, HttpStatus.BAD_REQUEST],
  [FriendRequestDuplicateError, HttpStatus.CONFLICT],
  [AlreadyFriendsError, HttpStatus.CONFLICT],
  [FriendRequestNotFoundError, HttpStatus.NOT_FOUND],
  [GameNotFoundError, HttpStatus.NOT_FOUND],
  [GameAdminRoleNotFoundError, HttpStatus.NOT_FOUND],
  [ForbiddenDomainError, HttpStatus.FORBIDDEN],
  [GoogleOAuthUnavailableError, HttpStatus.SERVICE_UNAVAILABLE],
  [NotificationNotFoundError, HttpStatus.NOT_FOUND],
  [ForbiddenNotificationError, HttpStatus.FORBIDDEN],
  [InvalidNotificationTypeError, HttpStatus.UNPROCESSABLE_ENTITY],
  [InvalidNotificationContentError, HttpStatus.UNPROCESSABLE_ENTITY],
  [InvalidRecipientError, HttpStatus.UNPROCESSABLE_ENTITY],
  [SelfReportError, HttpStatus.BAD_REQUEST],
  [ReportTypeNotFoundError, HttpStatus.NOT_FOUND],
  [ReportTypeInactiveError, HttpStatus.UNPROCESSABLE_ENTITY],
  [ReportNotFoundError, HttpStatus.NOT_FOUND],
  [ReportAlreadyResolvedError, HttpStatus.CONFLICT],
  [ReportTypeNameTakenError, HttpStatus.CONFLICT],
  [EmptyUpdateError, HttpStatus.BAD_REQUEST],
  [InvalidDeductionPointsError, HttpStatus.BAD_REQUEST],
  [GameConfigNotFoundError, HttpStatus.NOT_FOUND],
  [GameConfigDuplicateError, HttpStatus.CONFLICT],
  [GameConfigInvalidBoardSizeError, HttpStatus.BAD_REQUEST],
  [GameConfigInvalidMoveTimeError, HttpStatus.BAD_REQUEST],
  // Caro Match & Leaderboard errors
  [MatchNotFoundError, HttpStatus.NOT_FOUND],
  [PlayerAlreadyInActiveStateError, HttpStatus.CONFLICT],
  [NotAParticipantError, HttpStatus.FORBIDDEN],
  [MatchNotInExpectedStatusError, HttpStatus.CONFLICT],
  [NotMatchCreatorError, HttpStatus.FORBIDDEN],
  [NotYourTurnError, HttpStatus.FORBIDDEN],
  [CellAlreadyOccupiedError, HttpStatus.CONFLICT],
  [CellOutOfBoundsError, HttpStatus.BAD_REQUEST],
  [DrawRequestAlreadyPendingError, HttpStatus.CONFLICT],
  [NoDrawRequestPendingError, HttpStatus.NOT_FOUND],
  [ViewerMutedError, HttpStatus.FORBIDDEN],
  [NoActiveQuickPairRequestError, HttpStatus.NOT_FOUND],
  [NotFriendsError, HttpStatus.UNPROCESSABLE_ENTITY],
  [MatchPrivateAccessDeniedError, HttpStatus.FORBIDDEN],
  [MoveDeadlineExpiredError, HttpStatus.CONFLICT],
  // Tournament errors
  [TournamentNotFoundError, HttpStatus.NOT_FOUND],
  [TournamentAlreadyStartedError, HttpStatus.CONFLICT],
  [TournamentRegistrationClosedError, HttpStatus.UNPROCESSABLE_ENTITY],
  [InsufficientEloError, HttpStatus.FORBIDDEN],
  [AlreadyRegisteredError, HttpStatus.CONFLICT],
  [NotRegisteredError, HttpStatus.FORBIDDEN],
  [TournamentCreatorRoleAlreadyExistsError, HttpStatus.CONFLICT],
  [PendingRequestAlreadyExistsError, HttpStatus.CONFLICT],
  [TournamentCreatorRequestNotFoundError, HttpStatus.NOT_FOUND],
  [TournamentCreatorRequestNotPendingError, HttpStatus.CONFLICT],
  [PlayerProfileNotFoundError, HttpStatus.NOT_FOUND],
]);

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const [status, message] = this.resolve(exception);

    response.status(status).json({ statusCode: status, data: null, message });
  }

  private resolve(exception: unknown): [HttpStatus, string] {
    if (exception instanceof Error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = DOMAIN_ERROR_STATUS.get(exception.constructor as new (...args: any[]) => Error);
      if (status !== undefined) {
        return [status, exception.message];
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = this.extractMessage(exception.getResponse(), exception.message);
      return [status, message];
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    return [HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error'];
  }

  private extractMessage(body: unknown, fallback: string): string {
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object') {
      const candidate = (body as { message?: unknown }).message;
      if (Array.isArray(candidate)) return candidate.join(', ');
      if (typeof candidate === 'string') return candidate;
    }
    return fallback;
  }
}
