export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AccountNotFoundError extends DomainError {
  constructor() {
    super('ACCOUNT_NOT_FOUND', 'No account found with the given identifier.');
  }
}

export class SelfFriendRequestError extends DomainError {
  constructor() {
    super('FRIEND_REQUEST_SELF', 'You cannot send a friend request to yourself.');
  }
}

export class FriendRequestDuplicateError extends DomainError {
  constructor() {
    super('FRIEND_REQUEST_DUPLICATE', 'A pending friend request to this account already exists.');
  }
}

export class AlreadyFriendsError extends DomainError {
  constructor() {
    super('ALREADY_FRIENDS', 'You are already friends with this account.');
  }
}

export class FriendRequestNotFoundError extends DomainError {
  constructor() {
    super('NOT_FOUND', 'The requested friend request does not exist.');
  }
}

export class ForbiddenDomainError extends DomainError {
  constructor() {
    super('FORBIDDEN', 'You do not have permission to perform this action.');
  }
}

export class InvalidRefreshTokenError extends DomainError {
  constructor() {
    super('AUTH_REFRESH_TOKEN_INVALID', 'Refresh token is expired or invalid.');
  }
}

export class GameNotFoundError extends DomainError {
  constructor() {
    super('GAME_NOT_FOUND', 'No game is registered with the given ID.');
  }
}

export class GameAdminRoleNotFoundError extends DomainError {
  constructor() {
    super('GAME_ADMIN_ROLE_NOT_FOUND', 'The account does not hold Game Admin for this game.');
  }
}

export class GoogleOAuthUnavailableError extends DomainError {
  constructor() {
    super('GOOGLE_OAUTH_UNAVAILABLE', 'Google OAuth service is currently unavailable.');
  }
}
