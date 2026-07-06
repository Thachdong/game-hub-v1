import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  // Treat every authentication failure as a guest: no Authorization header,
  // an expired token, or an invalid/malformed token all fall back to `null`.
  // Only a genuine strategy error (`err`) is rethrown.
  handleRequest<T>(err: Error | null, user: T): T {
    if (err) throw err;
    return user ?? (null as T);
  }
}
