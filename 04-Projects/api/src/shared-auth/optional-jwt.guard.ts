import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  // Return null when no Authorization header is present.
  // Throw UnauthorizedException when a header is present but the token is invalid.
  handleRequest<T>(err: Error | null, user: T, info: { name?: string } | null): T {
    if (err) throw err;

    const isNoAuthHeader = info && (info as { message?: string }).message === 'No auth token';

    if (!user && isNoAuthHeader) {
      return null as T;
    }

    if (!user && info) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    return user;
  }
}
