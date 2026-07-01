// ── Match & Matchmaking errors ────────────────────────────────────────────────

export class MatchNotFoundError extends Error {
  readonly code = 'MATCH_NOT_FOUND';
  constructor() {
    super('Match not found');
    this.name = 'MatchNotFoundError';
  }
}

export class PlayerAlreadyInActiveStateError extends Error {
  readonly code = 'PLAYER_ALREADY_IN_ACTIVE_STATE';
  constructor() {
    super('Player is already in an active match or queue');
    this.name = 'PlayerAlreadyInActiveStateError';
  }
}

export class NotAParticipantError extends Error {
  readonly code = 'NOT_A_PARTICIPANT';
  constructor() {
    super('You are not a participant in this match');
    this.name = 'NotAParticipantError';
  }
}

export class MatchNotInExpectedStatusError extends Error {
  readonly code = 'MATCH_INVALID_STATUS';
  constructor(expected: string, actual: string) {
    super(`Match must be '${expected}' but is '${actual}'`);
    this.name = 'MatchNotInExpectedStatusError';
  }
}

export class NotMatchCreatorError extends Error {
  readonly code = 'NOT_MATCH_CREATOR';
  constructor() {
    super('Only the match creator can perform this action');
    this.name = 'NotMatchCreatorError';
  }
}

export class NotYourTurnError extends Error {
  readonly code = 'NOT_YOUR_TURN';
  constructor() {
    super('It is not your turn');
    this.name = 'NotYourTurnError';
  }
}

export class CellAlreadyOccupiedError extends Error {
  readonly code = 'CELL_OCCUPIED';
  constructor() {
    super('This cell is already occupied');
    this.name = 'CellAlreadyOccupiedError';
  }
}

export class CellOutOfBoundsError extends Error {
  readonly code = 'CELL_OUT_OF_BOUNDS';
  constructor() {
    super('Cell coordinates are out of board bounds');
    this.name = 'CellOutOfBoundsError';
  }
}

export class DrawRequestAlreadyPendingError extends Error {
  readonly code = 'DRAW_REQUEST_PENDING';
  constructor() {
    super('A draw request is already pending; wait for the opponent to respond');
    this.name = 'DrawRequestAlreadyPendingError';
  }
}

export class NoDrawRequestPendingError extends Error {
  readonly code = 'NO_DRAW_REQUEST';
  constructor() {
    super('There is no pending draw request to respond to');
    this.name = 'NoDrawRequestPendingError';
  }
}

export class ViewerMutedError extends Error {
  readonly code = 'VIEWER_MUTED';
  constructor() {
    super('You have been muted in this match');
    this.name = 'ViewerMutedError';
  }
}

export class NoActiveQuickPairRequestError extends Error {
  readonly code = 'NO_QUICK_PAIR_REQUEST';
  constructor() {
    super('You have no active Quick Pair request');
    this.name = 'NoActiveQuickPairRequestError';
  }
}

export class NotFriendsError extends Error {
  readonly code = 'NOT_FRIENDS';
  constructor() {
    super('You can only invite players who are your friends');
    this.name = 'NotFriendsError';
  }
}

export class MatchPrivateAccessDeniedError extends Error {
  readonly code = 'PRIVATE_MATCH_ACCESS_DENIED';
  constructor() {
    super('This is a private match');
    this.name = 'MatchPrivateAccessDeniedError';
  }
}

export class MoveDeadlineExpiredError extends Error {
  readonly code = 'DEADLINE_EXPIRED';
  constructor() {
    super('The move deadline has already expired');
    this.name = 'MoveDeadlineExpiredError';
  }
}

// ── Game Config errors (existing) ─────────────────────────────────────────────

export class GameConfigNotFoundError extends Error {
  readonly code = 'GAME_CONFIG_NOT_FOUND';
  constructor() {
    super('Game configuration not found');
    this.name = 'GameConfigNotFoundError';
  }
}

export class GameConfigDuplicateError extends Error {
  readonly code = 'GAME_CONFIG_DUPLICATE';
  constructor() {
    super('An active configuration with this board size and move time already exists');
    this.name = 'GameConfigDuplicateError';
  }
}

export class GameConfigInvalidBoardSizeError extends Error {
  readonly code = 'VALIDATION_ERROR';
  constructor() {
    super('Board size must be one of: 18x18, 25x25, 40x40');
    this.name = 'GameConfigInvalidBoardSizeError';
  }
}

export class GameConfigInvalidMoveTimeError extends Error {
  readonly code = 'VALIDATION_ERROR';
  constructor() {
    super('Move time must be one of: 5, 10, 15, 25, 35, 45, 60 seconds');
    this.name = 'GameConfigInvalidMoveTimeError';
  }
}
