import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class GameAdminCaroGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { gameAdminRoles?: string[] } }>();
    if (!request.user?.gameAdminRoles?.includes('caro')) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'This action requires the Caro Game Admin role.',
      });
    }
    return true;
  }
}
