import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCaroRealtimeEvent } from "./useCaroRealtime";

type Listener = (event: MessageEvent<string>) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static reset(): void {
    FakeEventSource.instances = [];
  }

  url: string;
  closed = false;
  private listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, payload: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: JSON.stringify(payload) } as MessageEvent<string>);
    }
  }
}

describe("useCaroRealtimeEvent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeEventSource.reset();
  });

  it("opens an EventSource against /api/caro/realtime and invokes the handler with parsed JSON", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const handler = vi.fn();

    renderHook(() => useCaroRealtimeEvent("lobby:updated", handler));

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toBe("/api/caro/realtime");

    FakeEventSource.instances[0].emit("lobby:updated", { matchId: "m1", action: "created" });

    expect(handler).toHaveBeenCalledWith({ matchId: "m1", action: "created" });
  });

  it("shares a single EventSource connection across multiple hook instances and closes it once all unmount", () => {
    vi.stubGlobal("EventSource", FakeEventSource);

    const first = renderHook(() => useCaroRealtimeEvent("lobby:updated", vi.fn()));
    renderHook(() => useCaroRealtimeEvent("quick_pair:matched", vi.fn()));

    expect(FakeEventSource.instances).toHaveLength(1);

    first.unmount();
    expect(FakeEventSource.instances[0].closed).toBe(false);
  });
});
