import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY_PORT, IMatchRepositoryPort } from '../../domain/ports/match.repository.port';
import { MATCH_TIMER_SERVICE_PORT, IMatchTimerServicePort } from '../../domain/ports/match-timer.service.port';
import { PLAYER_PROFILE_REPOSITORY_PORT, IPlayerProfileRepositoryPort } from '../../domain/ports/player-profile.repository.port';
import { REALTIME_ROOM_PORT, IRealtimeRoomPort } from '../../../realtime/realtime-push.port';
import {
  MatchNotFoundError,
  NotAParticipantError,
  MatchNotInExpectedStatusError,
  NotYourTurnError,
  CellAlreadyOccupiedError,
  CellOutOfBoundsError,
  MoveDeadlineExpiredError,
} from '../../domain/errors';
import { MatchMove } from '../../domain/entities/match-move';

interface PlaceMoveInput {
  matchId: string;
  playerId: string;
  row: number;
  col: number;
}

interface PlaceMoveResult {
  move: MatchMove;
  isGameOver: boolean;
  result?: string;
  winnerId?: string;
}

// Board dimension look-up
const BOARD_DIMS: Record<string, number> = {
  '18x18': 18,
  '25x25': 25,
  '40x40': 40,
};

@Injectable()
export class PlaceMoveUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY_PORT) private readonly matchRepo: IMatchRepositoryPort,
    @Inject(MATCH_TIMER_SERVICE_PORT) private readonly timerService: IMatchTimerServicePort,
    @Inject(PLAYER_PROFILE_REPOSITORY_PORT) private readonly profileRepo: IPlayerProfileRepositoryPort,
    @Inject(REALTIME_ROOM_PORT) private readonly realtimeRoom: IRealtimeRoomPort,
  ) {}

  async execute(input: PlaceMoveInput): Promise<PlaceMoveResult> {
    const match = await this.matchRepo.findById(input.matchId);
    if (!match) throw new MatchNotFoundError();
    if (match.status !== 'in_progress') {
      throw new MatchNotInExpectedStatusError('in_progress', match.status);
    }

    const isX = match.playerXId === input.playerId;
    const isO = match.playerOId === input.playerId;
    if (!isX && !isO) throw new NotAParticipantError();
    if (match.currentTurnPlayerId !== input.playerId) throw new NotYourTurnError();

    if (match.deadlineAt && new Date() > match.deadlineAt) throw new MoveDeadlineExpiredError();

    const size = BOARD_DIMS[match.boardSize] ?? 18;
    if (input.row < 0 || input.row >= size || input.col < 0 || input.col >= size) {
      throw new CellOutOfBoundsError();
    }

    const existingMoves = await this.matchRepo.findMovesByMatchId(input.matchId);
    const occupied = existingMoves.some(m => m.row === input.row && m.col === input.col);
    if (occupied) throw new CellAlreadyOccupiedError();

    const sequenceNumber = await this.matchRepo.findNextSequenceNumber(input.matchId);
    const move = await this.matchRepo.saveMove({
      matchId: input.matchId,
      playerId: input.playerId,
      row: input.row,
      col: input.col,
      sequenceNumber,
    });

    this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:move_placed', {
      matchId: input.matchId,
      move: { playerId: input.playerId, row: input.row, col: input.col, sequenceNumber },
    });

    // Build board for win detection
    const allMoves = [...existingMoves, move];
    const board = this.buildBoard(allMoves, size);

    const winnerId = this.checkWin(board, input.row, input.col, size)
      ? input.playerId
      : undefined;

    const isDraw = !winnerId && allMoves.length === size * size;

    if (winnerId || isDraw) {
      this.timerService.cancelTimer(input.matchId);
      const result = winnerId ? (isX ? 'x_wins' : 'o_wins') : 'draw';
      const [xDelta, oDelta] = this.computeEloDelta(
        match.playerXId!,
        match.playerOId!,
        winnerId,
        await this.profileRepo.findByPlayerId(match.playerXId!),
        await this.profileRepo.findByPlayerId(match.playerOId!),
      );

      await Promise.all([
        this.matchRepo.update(input.matchId, {
          status: 'completed',
          result,
          winnerPlayerId: winnerId ?? null,
          playerXEloChange: xDelta,
          playerOEloChange: oDelta,
          endedAt: new Date(),
        }),
        this.profileRepo.updateEloAtomic(match.playerXId!, xDelta, winnerId === match.playerXId ? 'win' : (isDraw ? 'draw' : 'loss')),
        this.profileRepo.updateEloAtomic(match.playerOId!, oDelta, winnerId === match.playerOId ? 'win' : (isDraw ? 'draw' : 'loss')),
      ]);

      this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:ended', {
        matchId: input.matchId,
        result,
        winnerPlayerId: winnerId ?? null,
        playerXEloChange: xDelta,
        playerOEloChange: oDelta,
      });

      return { move, isGameOver: true, result, winnerId };
    }

    // Game continues — schedule next move timer
    const nextPlayerId = isX ? match.playerOId! : match.playerXId!;
    const deadlineAt = new Date(Date.now() + match.moveTimeSeconds * 1000);

    await this.matchRepo.update(input.matchId, {
      currentTurnPlayerId: nextPlayerId,
      deadlineAt,
      pendingDrawRequestFromId: null,
    });

    this.timerService.scheduleMoveTimer(input.matchId, deadlineAt, async () => {
      await this.handleMoveTimeout(input.matchId, nextPlayerId, match.playerXId!, match.playerOId!, match.moveTimeSeconds);
    });

    this.realtimeRoom.pushToRoom(`match:${input.matchId}`, 'match:turn_changed', {
      matchId: input.matchId,
      currentTurnPlayerId: nextPlayerId,
      deadlineAt,
    });

    return { move, isGameOver: false };
  }

  private buildBoard(moves: MatchMove[], size: number): (string | null)[][] {
    const board: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
    for (const m of moves) {
      board[m.row][m.col] = m.playerId;
    }
    return board;
  }

  private checkWin(board: (string | null)[][], row: number, col: number, size: number): boolean {
    const player = board[row][col];
    if (!player) return false;
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let step = 1; step < 5; step++) {
        const r = row + dr * step, c = col + dc * step;
        if (r < 0 || r >= size || c < 0 || c >= size || board[r][c] !== player) break;
        count++;
      }
      for (let step = 1; step < 5; step++) {
        const r = row - dr * step, c = col - dc * step;
        if (r < 0 || r >= size || c < 0 || c >= size || board[r][c] !== player) break;
        count++;
      }
      if (count >= 5) return true;
    }
    return false;
  }

  private computeEloDelta(
    playerXId: string,
    playerOId: string,
    winnerId: string | undefined,
    profileX: { elo: number; matchesPlayed: number } | null,
    profileO: { elo: number; matchesPlayed: number } | null,
  ): [number, number] {
    const rX = profileX?.elo ?? 1200;
    const rO = profileO?.elo ?? 1200;
    const matchesX = profileX?.matchesPlayed ?? 0;
    const matchesO = profileO?.matchesPlayed ?? 0;
    const kX = matchesX < 30 ? 40 : 20;
    const kO = matchesO < 30 ? 40 : 20;
    const eX = 1 / (1 + Math.pow(10, (rO - rX) / 400));
    const eO = 1 - eX;
    const sX = winnerId === playerXId ? 1 : winnerId === playerOId ? 0 : 0.5;
    const sO = 1 - sX;
    return [Math.round(kX * (sX - eX)), Math.round(kO * (sO - eO))];
  }

  private async handleMoveTimeout(
    matchId: string,
    timedOutPlayerId: string,
    playerXId: string,
    playerOId: string,
    moveTimeSeconds: number,
  ): Promise<void> {
    const match = await this.matchRepo.findById(matchId);
    if (!match || match.status !== 'in_progress') return;
    if (match.currentTurnPlayerId !== timedOutPlayerId) return;

    const winnerId = playerXId === timedOutPlayerId ? playerOId : playerXId;
    const result = winnerId === playerXId ? 'x_wins' : 'o_wins';

    const [profileX, profileO] = await Promise.all([
      this.profileRepo.findByPlayerId(playerXId),
      this.profileRepo.findByPlayerId(playerOId),
    ]);
    const [xDelta, oDelta] = this.computeEloDelta(playerXId, playerOId, winnerId, profileX, profileO);

    await Promise.all([
      this.matchRepo.update(matchId, {
        status: 'completed',
        result,
        winnerPlayerId: winnerId,
        playerXEloChange: xDelta,
        playerOEloChange: oDelta,
        endedAt: new Date(),
      }),
      this.profileRepo.updateEloAtomic(playerXId, xDelta, winnerId === playerXId ? 'win' : 'loss'),
      this.profileRepo.updateEloAtomic(playerOId, oDelta, winnerId === playerOId ? 'win' : 'loss'),
    ]);

    this.realtimeRoom.pushToRoom(`match:${matchId}`, 'match:ended', {
      matchId,
      result,
      winnerPlayerId: winnerId,
      playerXEloChange: xDelta,
      playerOEloChange: oDelta,
      reason: 'timeout',
    });
  }
}
