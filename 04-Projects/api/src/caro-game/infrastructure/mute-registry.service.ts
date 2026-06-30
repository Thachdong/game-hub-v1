import { Injectable } from '@nestjs/common';

@Injectable()
export class MuteRegistryService {
  private readonly registry = new Map<string, Set<string>>();

  mute(matchId: string, viewerId: string): void {
    if (!this.registry.has(matchId)) this.registry.set(matchId, new Set());
    this.registry.get(matchId)!.add(viewerId);
  }

  isMuted(matchId: string, viewerId: string): boolean {
    return this.registry.get(matchId)?.has(viewerId) ?? false;
  }

  clearMatch(matchId: string): void {
    this.registry.delete(matchId);
  }
}
