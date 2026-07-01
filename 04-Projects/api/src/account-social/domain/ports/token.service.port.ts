export interface AccessTokenPayload {
  sub: string;
  email: string;
  isPlatformAdmin: boolean;
  gameAdminRoles: string[];
  isTournamentCreator: boolean;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

export interface ITokenService {
  signAccessToken(payload: AccessTokenPayload): string;
  signRefreshToken(sub: string): string;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');
