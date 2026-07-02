import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = await super.canActivate(context);
    if (result) {
      const request = context.switchToHttp().getRequest<{ user?: { sub?: string } }>();
      const accountId = request.user?.sub;
      if (accountId) {
        // Fire-and-forget — must not add latency to authenticated requests
        this.eventEmitter.emit('auth.request-authenticated', {
          accountId,
          occurredAt: new Date(),
        });
      }
    }
    return result as boolean;
  }
}
