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
