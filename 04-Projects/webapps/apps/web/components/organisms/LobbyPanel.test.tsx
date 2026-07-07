import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { LobbyPanel } from "./LobbyPanel";

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

type LobbyHandler = (payload: { matchId: string; action: string }) => void;
let capturedHandler: LobbyHandler | undefined;
const useCaroRealtimeEventMock = vi.fn((_eventName: string, handler: LobbyHandler) => {
  capturedHandler = handler;
});

vi.mock("@/lib/useCaroRealtime", () => ({
  useCaroRealtimeEvent: (eventName: string, handler: LobbyHandler) => useCaroRealtimeEventMock(eventName, handler),
}));

const match = (id: string, creatorUsername: string) => ({
  id,
  boardSize: "18x18",
  moveTimeSeconds: 15,
  status: "waiting",
  creatorUsername,
  secondPlayerUsername: null,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("LobbyPanel", () => {
  beforeEach(() => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/game-caro");
  });

  it("renders a card per open match", () => {
    render(<LobbyPanel initialMatches={[match("m1", "alice"), match("m2", "bob")]} />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("shows an empty state when there are no open matches", () => {
    render(<LobbyPanel initialMatches={[]} />);

    expect(screen.getByText(/no open matches/i)).toBeInTheDocument();
  });

  it("removes a match from the list when a lobby:updated 'filled' event fires for it", () => {
    render(<LobbyPanel initialMatches={[match("m1", "alice"), match("m2", "bob")]} />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    act(() => {
      capturedHandler?.({ matchId: "m1", action: "filled" });
    });

    expect(screen.queryByText("alice")).not.toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });
});
