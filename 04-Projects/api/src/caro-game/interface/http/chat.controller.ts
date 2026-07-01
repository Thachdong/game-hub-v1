import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiDataResponse, ApiErrorResponse } from '@common/decorators/api-response.decorator';
import { JwtAuthGuard } from '../../../shared-auth/jwt-auth.guard';
import { SendChatMessageUseCase } from '../../application/use-cases/send-chat-message.use-case';
import { GetChatHistoryUseCase } from '../../application/use-cases/get-chat-history.use-case';
import { MuteViewerUseCase } from '../../application/use-cases/mute-viewer.use-case';
import { SendChatDto, MuteViewerDto, ChatMessageResponseDto } from '../dto/chat.dto';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@ApiTags('Caro — Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caro/matches/:matchId/chat')
export class ChatController {
  constructor(
    private readonly sendChat: SendChatMessageUseCase,
    private readonly getChatHistory: GetChatHistoryUseCase,
    private readonly muteViewer: MuteViewerUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get chat history for a match' })
  @ApiDataResponse(ChatMessageResponseDto, { isArray: true })
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Match not found')
  async history(
    @Param('matchId', ParseUUIDPipe) matchId: string,
  ): Promise<ChatMessageResponseDto[]> {
    const messages = await this.getChatHistory.execute(matchId);
    return messages.map((m) => ({
      id: m.id,
      matchId: m.matchId,
      senderId: m.senderId,
      content: m.content,
      sentAt: m.sentAt,
    }));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a chat message in a match' })
  @ApiDataResponse(ChatMessageResponseDto)
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Viewer is muted')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Match not found')
  async send(
    @Req() req: AuthenticatedRequest,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: SendChatDto,
  ): Promise<ChatMessageResponseDto> {
    const msg = await this.sendChat.execute({
      matchId,
      senderId: req.user.sub,
      content: dto.content,
    });
    return { id: msg.id, matchId: msg.matchId, senderId: msg.senderId, content: msg.content, sentAt: msg.sentAt };
  }

  @Post('mute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mute a viewer in this match (participants only)' })
  @ApiErrorResponse(HttpStatus.FORBIDDEN, 'Not a participant')
  @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Match not found')
  async mute(
    @Req() req: AuthenticatedRequest,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: MuteViewerDto,
  ): Promise<void> {
    await this.muteViewer.execute({
      matchId,
      requesterId: req.user.sub,
      viewerId: dto.viewerId,
    });
  }
}
