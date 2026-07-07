import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

// ── Request DTOs ──────────────────────────────────────────────────────────────

export class CreateMatchDto {
  @ApiProperty({ description: 'Active game configuration UUID' })
  @IsUUID()
  configId: string;

  @ApiProperty({ enum: ['public', 'private'] })
  @IsIn(['public', 'private'])
  visibility: 'public' | 'private';
}

export class InvitePlayerDto {
  @ApiProperty({ description: 'UUID of the friend to invite' })
  @IsUUID()
  friendId: string;
}

export class RespondInvitationDto {
  @ApiProperty({ enum: ['accept', 'decline'] })
  @IsIn(['accept', 'decline'])
  action: 'accept' | 'decline';
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export class PlayerInMatchDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty() elo: number;
  @ApiProperty() winRate: number;
}

export class MoveDto {
  @ApiProperty() playerId: string;
  @ApiProperty() row: number;
  @ApiProperty() col: number;
  @ApiProperty() sequenceNumber: number;
  @ApiProperty() placedAt: Date;
}

export class MatchStateDto {
  @ApiProperty() id: string;
  @ApiProperty() boardSize: string;
  @ApiProperty() moveTimeSeconds: number;
  @ApiProperty() visibility: string;
  @ApiProperty() status: string;
  @ApiProperty() creatorId: string;
  @ApiProperty({ nullable: true }) tournamentId: string | null;
  @ApiProperty({ type: PlayerInMatchDto, nullable: true }) playerX: PlayerInMatchDto | null;
  @ApiProperty({ type: PlayerInMatchDto, nullable: true }) playerO: PlayerInMatchDto | null;
  @ApiProperty({ nullable: true }) currentTurnPlayerId: string | null;
  @ApiProperty({ nullable: true }) deadlineAt: Date | null;
  @ApiProperty({ type: [MoveDto] }) moves: MoveDto[];
  @ApiProperty({ type: [String] }) viewers: string[];
  @ApiProperty({ nullable: true }) pendingDrawRequestFromId: string | null;
  @ApiProperty({ nullable: true }) result: string | null;
  @ApiProperty({ nullable: true }) winnerPlayerId: string | null;
  @ApiProperty({ nullable: true }) startedAt: Date | null;
  @ApiProperty({ nullable: true }) endedAt: Date | null;
  @ApiProperty() createdAt: Date;
}

export class LobbyMatchDto {
  @ApiProperty() id: string;
  @ApiProperty() boardSize: string;
  @ApiProperty() moveTimeSeconds: number;
  @ApiProperty() status: string;
  @ApiProperty() creatorUsername: string;
  @ApiProperty({ nullable: true }) secondPlayerUsername: string | null;
  @ApiProperty() createdAt: Date;
}

export class CreateMatchResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() configId: string;
  @ApiProperty() boardSize: string;
  @ApiProperty() moveTimeSeconds: number;
  @ApiProperty() visibility: string;
  @ApiProperty() status: string;
  @ApiProperty() creatorId: string;
  @ApiProperty() createdAt: Date;
}

export class JoinMatchResponseDto {
  @ApiProperty() matchId: string;
  @ApiProperty() status: string;
}

export class CancelOrLeaveResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() status: string;
}

export class InviteResponseDto {
  @ApiProperty() matchId: string;
  @ApiProperty() invitedPlayerId: string;
}

export class InvitationRespondResponseDto {
  @ApiProperty() matchId: string;
  @ApiProperty() status: string;
}
