import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { isPlatformAdmin?: boolean } }>();
    if (!request.user?.isPlatformAdmin) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'This action requires Platform Admin privileges.',
      });
    }
    return true;
  }
}
