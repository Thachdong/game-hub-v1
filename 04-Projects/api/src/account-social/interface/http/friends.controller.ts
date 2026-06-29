import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@interface/guards/jwt-auth.guard';
import { SendFriendRequestUseCase } from '@application/commands/send-friend-request.use-case';
import { ResolveFriendRequestUseCase } from '@application/commands/resolve-friend-request.use-case';
import { GetFriendsUseCase } from '@application/queries/get-friends.use-case';
import { GetFriendRequestsUseCase } from '@application/queries/get-friend-requests.use-case';
import { SendFriendRequestDto } from '@interface/dto/friends/send-friend-request.dto';
import { ResolveFriendRequestDto } from '@interface/dto/friends/resolve-friend-request.dto';
import { FriendRequestRecordDto } from '@interface/dto/friends/friend-request-record.dto';
import {
  FriendsResponseDto,
  FriendRequestsResponseDto,
  FriendProfileDto,
} from '@interface/dto/friends/friends-response.dto';
import {
  AccountNotFoundError,
  SelfFriendRequestError,
  FriendRequestDuplicateError,
  AlreadyFriendsError,
  FriendRequestNotFoundError,
  ForbiddenDomainError,
} from '@domain/errors';
import { AccessTokenPayload } from '@domain/ports/token.service.port';
import { FriendRequest } from '@domain/entities/friend-request';
import { Account } from '@domain/entities/account';

function toFriendRequestDto(r: FriendRequest): FriendRequestRecordDto {
  return {
    id: r.id,
    senderId: r.senderId,
    receiverId: r.receiverId,
    status: r.status,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
  };
}

function toFriendProfileDto(a: Account): FriendProfileDto {
  return { id: a.id, email: a.email, username: a.username, avatarUrl: a.avatarUrl };
}

function mapDomainError(err: unknown): never {
  if (err instanceof AccountNotFoundError)
    throw new HttpException({ code: err.code, message: err.message }, HttpStatus.NOT_FOUND);
  if (err instanceof SelfFriendRequestError)
    throw new HttpException({ code: err.code, message: err.message }, HttpStatus.BAD_REQUEST);
  if (err instanceof FriendRequestDuplicateError)
    throw new HttpException({ code: err.code, message: err.message }, HttpStatus.CONFLICT);
  if (err instanceof AlreadyFriendsError)
    throw new HttpException({ code: err.code, message: err.message }, HttpStatus.CONFLICT);
  if (err instanceof FriendRequestNotFoundError)
    throw new HttpException({ code: err.code, message: err.message }, HttpStatus.NOT_FOUND);
  if (err instanceof ForbiddenDomainError)
    throw new HttpException({ code: err.code, message: err.message }, HttpStatus.FORBIDDEN);
  throw err;
}

@ApiTags('Friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  constructor(
    private readonly sendFriendRequest: SendFriendRequestUseCase,
    private readonly resolveFriendRequest: ResolveFriendRequestUseCase,
    private readonly getFriends: GetFriendsUseCase,
    private readonly getFriendRequests: GetFriendRequestsUseCase,
  ) {}

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a friend request by target email' })
  @ApiResponse({ status: 201, type: FriendRequestRecordDto })
  @ApiResponse({ status: 400, description: 'Self-request' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 409, description: 'Duplicate or already friends' })
  async sendRequest(
    @Req() req: { user: AccessTokenPayload },
    @Body() dto: SendFriendRequestDto,
  ): Promise<FriendRequestRecordDto> {
    try {
      const result = await this.sendFriendRequest.execute(req.user.sub, dto.targetEmail);
      return toFriendRequestDto(result);
    } catch (err) {
      mapDomainError(err);
    }
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get incoming and outgoing pending friend requests' })
  @ApiResponse({ status: 200, type: FriendRequestsResponseDto })
  async listRequests(
    @Req() req: { user: AccessTokenPayload },
  ): Promise<FriendRequestsResponseDto> {
    const result = await this.getFriendRequests.execute(req.user.sub);
    return {
      incoming: result.incoming.map(toFriendRequestDto),
      outgoing: result.outgoing.map(toFriendRequestDto),
    };
  }

  @Patch('requests/:id')
  @ApiOperation({ summary: 'Accept or reject a friend request' })
  @ApiResponse({ status: 200, type: FriendRequestRecordDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 409, description: 'Already friends' })
  async resolve(
    @Req() req: { user: AccessTokenPayload },
    @Param('id') id: string,
    @Body() dto: ResolveFriendRequestDto,
  ): Promise<FriendRequestRecordDto> {
    try {
      const result = await this.resolveFriendRequest.execute(req.user.sub, id, dto.action);
      return toFriendRequestDto(result);
    } catch (err) {
      mapDomainError(err);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List friends' })
  @ApiResponse({ status: 200, type: FriendsResponseDto })
  async list(@Req() req: { user: AccessTokenPayload }): Promise<FriendsResponseDto> {
    const accounts = await this.getFriends.execute(req.user.sub);
    return { friends: accounts.map(toFriendProfileDto) };
  }
}
