import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { GetNotificationsUseCase } from '../../application/queries/get-notifications.use-case';
import { MarkNotificationReadUseCase } from '../../application/commands/mark-notification-read.use-case';
import { GetNotificationsQueryDto } from '../dto/get-notifications-query.dto';
import { NotificationListResponseDto } from '../dto/notification-list-response.dto';
import { MarkReadResponseDto } from '../dto/mark-read-response.dto';
import { NotificationMapper } from '../mappers/notification.mapper';
import { AccessTokenPayload } from '../../../account-social/domain/ports/token.service.port';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get authenticated player notification list (newest first)' })
  @ApiResponse({ status: 200, type: NotificationListResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  async list(
    @Req() req: { user: AccessTokenPayload },
    @Query() query: GetNotificationsQueryDto,
  ): Promise<NotificationListResponseDto> {
    const hasCursorCreatedAt = query.cursorCreatedAt !== undefined;
    const hasCursorId = query.cursorId !== undefined;
    if (hasCursorCreatedAt !== hasCursorId) {
      throw new BadRequestException('cursorCreatedAt and cursorId must be provided together');
    }

    const cursor =
      hasCursorCreatedAt && hasCursorId
        ? { createdAt: new Date(query.cursorCreatedAt!), id: query.cursorId! }
        : undefined;

    const result = await this.getNotificationsUseCase.execute({
      recipientId: req.user.sub,
      limit: query.limit,
      cursor,
    });

    return {
      items: result.items.map(NotificationMapper.toEntryDto),
      nextCursor: result.nextCursor
        ? { createdAt: result.nextCursor.createdAt.toISOString(), id: result.nextCursor.id }
        : null,
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read (idempotent)' })
  @ApiResponse({ status: 200, type: MarkReadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Notification belongs to a different user' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markRead(
    @Req() req: { user: AccessTokenPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MarkReadResponseDto> {
    const notification = await this.markNotificationReadUseCase.execute({
      notificationId: id,
      callerId: req.user.sub,
    });
    return NotificationMapper.toEntryDto(notification) as MarkReadResponseDto;
  }
}
