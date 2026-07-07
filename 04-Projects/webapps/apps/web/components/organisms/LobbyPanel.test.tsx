import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { createMatchAction } from "@/lib/actions/caro";
import { LobbyPanel } from "./LobbyPanel";

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));
vi.mock("@/lib/actions/caro", () => ({
  joinMatchAction: vi.fn(),
  createMatchAction: vi.fn(),
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

const gameConfigs = [{ id: "cfg1", boardSize: "18x18" as const, moveTimeSeconds: 15 as const, createdAt: "" }];

describe("LobbyPanel", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/game-caro");
  });

  it("renders a card per open match", () => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });

    render(<LobbyPanel initialMatches={[match("m1", "alice"), match("m2", "bob")]} gameConfigs={gameConfigs} />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("shows an empty state when there are no open matches", () => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });

    render(<LobbyPanel initialMatches={[]} gameConfigs={gameConfigs} />);

    expect(screen.getByText(/no open matches/i)).toBeInTheDocument();
  });

  it("removes a match from the list when a lobby:updated 'filled' event fires for it", () => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });

    render(<LobbyPanel initialMatches={[match("m1", "alice"), match("m2", "bob")]} gameConfigs={gameConfigs} />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    act(() => {
      capturedHandler?.({ matchId: "m1", action: "filled" });
    });

    expect(screen.queryByText("alice")).not.toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("redirects a signed-out click on Create Game to /login instead of opening the modal", () => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    render(<LobbyPanel initialMatches={[]} gameConfigs={gameConfigs} />);

    fireEvent.click(screen.getByRole("button", { name: /create game/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro");
  });

  it("opens the modal for a signed-in click, and a successful submit prepends the new match without a reload", async () => {
    vi.mocked(useAuthSession).mockReturnValue({
      isSignedIn: true,
      account: { id: "u1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(createMatchAction).mockResolvedValue({
      ok: true,
      statusCode: 201,
      message: "ok",
      data: {
        id: "new-match",
        configId: "cfg1",
        boardSize: "18x18",
        moveTimeSeconds: 15,
        visibility: "public",
        status: "waiting",
        creatorId: "u1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    render(<LobbyPanel initialMatches={[match("m1", "bob")]} gameConfigs={gameConfigs} />);

    fireEvent.click(screen.getByRole("button", { name: /create game/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const aliceEntries = screen.getAllByText("alice");
    expect(aliceEntries.length).toBeGreaterThan(0);
    expect(screen.getByText("bob")).toBeInTheDocument();
  });
});
