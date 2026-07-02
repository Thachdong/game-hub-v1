import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TournamentCreatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { isTournamentCreator?: boolean } }>();
    if (!request.user?.isTournamentCreator) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'This action requires the Tournament Creator role.',
      });
    }
    return true;
  }
}
