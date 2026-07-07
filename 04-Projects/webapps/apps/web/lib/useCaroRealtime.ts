"use client";

import { useEffect, useRef } from "react";

// One EventSource shared across every hook instance on the page (contracts/realtime-bridge.md
// "Client usage") — each subscribed event name is multiplexed over this single connection instead
// of opening a new stream per card/panel. When a matchId is supplied (gameboard page,
// contracts/realtime-bridge-addendum.md) or a tournamentId is supplied (tournament page,
// contracts/realtime-tournament-addendum.md), it's threaded into the shared URL so the Route
// Handler joins that room; every subscriber on the same page passes the same id, so the
// pool/refcount behavior is unaffected. A page never needs both at once.
let sharedSource: EventSource | null = null;
let refCount = 0;

function acquireSharedSource(matchId?: string, tournamentId?: string): EventSource {
  if (!sharedSource) {
    const params = new URLSearchParams();
    if (matchId) params.set("matchId", matchId);
    else if (tournamentId) params.set("tournamentId", tournamentId);
    const qs = params.toString();
    sharedSource = new EventSource(qs ? `/api/caro/realtime?${qs}` : "/api/caro/realtime");
  }
  refCount += 1;
  return sharedSource;
}

function releaseSharedSource(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && sharedSource) {
    sharedSource.close();
    sharedSource = null;
  }
}

/**
 * Subscribes to one named SSE event from the realtime bridge for the lifetime of the component.
 * Pass `matchId` on the gameboard page so the shared connection joins that match's room
 * (contracts/realtime-bridge-addendum.md), or `tournamentId` on the tournament page
 * (contracts/realtime-tournament-addendum.md); omit both for lobby-level events (`lobby:updated`,
 * `quick_pair:matched`).
 */
export function useCaroRealtimeEvent<T = unknown>(
  eventName: string,
  handler: (payload: T) => void,
  matchId?: string,
  tournamentId?: string
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const source = acquireSharedSource(matchId, tournamentId);

    function listener(event: MessageEvent<string>) {
      handlerRef.current(JSON.parse(event.data) as T);
    }

    source.addEventListener(eventName, listener as EventListener);
    return () => {
      source.removeEventListener(eventName, listener as EventListener);
      releaseSharedSource();
    };
  }, [eventName, matchId, tournamentId]);
}
