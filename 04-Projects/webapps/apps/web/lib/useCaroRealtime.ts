"use client";

import { useEffect, useRef } from "react";

// One EventSource shared across every hook instance on the page (contracts/realtime-bridge.md
// "Client usage") — each subscribed event name is multiplexed over this single connection instead
// of opening a new stream per card/panel. When a matchId is supplied (gameboard page,
// contracts/realtime-bridge-addendum.md), it's threaded into the shared URL so the Route Handler
// joins that match's room; every subscriber on the same page passes the same matchId, so the
// pool/refcount behavior is unaffected.
let sharedSource: EventSource | null = null;
let refCount = 0;

function acquireSharedSource(matchId?: string): EventSource {
  if (!sharedSource) {
    const url = matchId ? `/api/caro/realtime?matchId=${matchId}` : "/api/caro/realtime";
    sharedSource = new EventSource(url);
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
 * (contracts/realtime-bridge-addendum.md); omit it for lobby-level events (`lobby:updated`,
 * `quick_pair:matched`).
 */
export function useCaroRealtimeEvent<T = unknown>(
  eventName: string,
  handler: (payload: T) => void,
  matchId?: string
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const source = acquireSharedSource(matchId);

    function listener(event: MessageEvent<string>) {
      handlerRef.current(JSON.parse(event.data) as T);
    }

    source.addEventListener(eventName, listener as EventListener);
    return () => {
      source.removeEventListener(eventName, listener as EventListener);
      releaseSharedSource();
    };
  }, [eventName, matchId]);
}
