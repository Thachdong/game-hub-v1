"use client";

import { useEffect, useRef } from "react";

// One EventSource shared across every hook instance on the page (contracts/realtime-bridge.md
// "Client usage") — each subscribed event name is multiplexed over this single connection instead
// of opening a new stream per card/panel.
let sharedSource: EventSource | null = null;
let refCount = 0;

function acquireSharedSource(): EventSource {
  if (!sharedSource) {
    sharedSource = new EventSource("/api/caro/realtime");
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

/** Subscribes to one named SSE event from the realtime bridge for the lifetime of the component. */
export function useCaroRealtimeEvent<T = unknown>(eventName: string, handler: (payload: T) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const source = acquireSharedSource();

    function listener(event: MessageEvent<string>) {
      handlerRef.current(JSON.parse(event.data) as T);
    }

    source.addEventListener(eventName, listener as EventListener);
    return () => {
      source.removeEventListener(eventName, listener as EventListener);
      releaseSharedSource();
    };
  }, [eventName]);
}
