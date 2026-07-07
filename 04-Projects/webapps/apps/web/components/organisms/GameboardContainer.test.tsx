import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchState } from "@game-hub/caro-service";
import { useAuthSession } from "@/components/templates/Providers";
import { useRouter } from "next/navigation";

const muteMatchViewerActionMock = vi.fn();
const getMatchActionMock = vi.fn();
const startMatchActionMock = vi.fn();

vi.mock("@/lib/actions/caro", () => ({
  muteMatchViewerAction: muteMatchViewerActionMock,
  getMatchAction: getMatchActionMock,
  startMatchAction: startMatchActionMock,
}));

type Handler = (payload: unknown) => void;
const handlers: Record<string, Handler> = {};
const useCaroRealtimeEventMock = vi.fn((eventName: string, handler: Handler, _matchId?: string) => {
  handlers[eventName] = handler;
});

vi.mock("@/lib/useCaroRealtime", () => ({
  useCaroRealtimeEvent: (eventName: string, handler: Handler, matchId?: string) =>
    useCaroRealtimeEventMock(eventName, handler, matchId),
}));

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/game-caro/m1"),
}));
vi.mock("@/components/organisms/ChatBox", () => ({
  ChatBox: () => <div data-testid="chat-box" />,
}));
vi.mock("@/components/molecules/ReportPlayerForm", () => ({
  ReportPlayerForm: () => <button type="button">Report</button>,
}));

const mockedUseAuthSession = vi.mocked(useAuthSession);
const mockedUseRouter = vi.mocked(useRouter);

const { GameboardContainer } = await import("./GameboardContainer.js");

function makeMatch(overrides: Partial<MatchState> = {}): MatchState {
  return {
    id: "m1",
    boardSize: "3x3",
    moveTimeSeconds: 15,
    visibility: "public",
    status: "looking_for_opponent",
    creatorId: "c1",
    playerX: { id: "c1", username: "creator", elo: 1500, winRate: 0.5 },
    playerO: null,
    currentTurnPlayerId: null,
    deadlineAt: null,
    moves: [],
    viewers: [],
    pendingDrawRequestFromId: null,
    result: null,
    winnerPlayerId: null,
    startedAt: null,
    endedAt: null,
    createdAt: "t",
    ...overrides,
  };
}

describe("GameboardContainer", () => {
  beforeEach(() => {
    muteMatchViewerActionMock.mockClear();
    getMatchActionMock.mockReset();
    startMatchActionMock.mockReset();
  });

  it("renders the board and the side panel for the initial match state", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });

    render(<GameboardContainer initialMatch={makeMatch()} />);

    expect(screen.getAllByRole("gridcell")).toHaveLength(9);
    expect(screen.getByTestId("gameboard-state-1")).toBeInTheDocument();
  });

  it("adds a viewer on match:viewer_joined and removes it on match:viewer_left", async () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });

    render(<GameboardContainer initialMatch={makeMatch()} />);

    act(() => {
      handlers["match:viewer_joined"]?.({ matchId: "m1", viewerId: "v1", viewerUsername: "spectator1" });
    });
    await waitFor(() => expect(screen.getByText("spectator1")).toBeInTheDocument());

    act(() => {
      handlers["match:viewer_left"]?.({ matchId: "m1", viewerId: "v1" });
    });
    await waitFor(() => expect(screen.queryByText("spectator1")).not.toBeInTheDocument());
  });

  it("calls muteMatchViewerAction with the match id and viewer id when a participant clicks mute", async () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "c1", email: "c@b.com", username: "creator", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });

    render(<GameboardContainer initialMatch={makeMatch()} />);

    act(() => {
      handlers["match:viewer_joined"]?.({ matchId: "m1", viewerId: "v1", viewerUsername: "spectator1" });
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /mute/i })).toBeInTheDocument());

    screen.getByRole("button", { name: /mute/i }).click();

    expect(muteMatchViewerActionMock).toHaveBeenCalledWith({ matchId: "m1", viewerId: "v1" });
  });

  describe("US1 acceptance: guest redirects for every gated control (T045, quickstart.md item 1)", () => {
    it("redirects on Start (state 2)", () => {
      mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
      const push = vi.fn();
      mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

      render(
        <GameboardContainer
          initialMatch={makeMatch({
            status: "waiting_for_start",
            playerO: { id: "p2", username: "bob", elo: 1400, winRate: 0.4 },
            deadlineAt: new Date(Date.now() + 10_000).toISOString(),
          })}
        />
      );

      screen.getByRole("button", { name: /start/i }).click();
      expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
    });

    it("redirects on Request Draw, Surrender, and an empty board-cell click (state 3)", () => {
      mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
      const push = vi.fn();
      mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

      render(
        <GameboardContainer
          initialMatch={makeMatch({
            status: "in_progress",
            playerX: { id: "c1", username: "creator", elo: 1500, winRate: 0.5 },
            playerO: { id: "p2", username: "bob", elo: 1400, winRate: 0.4 },
            currentTurnPlayerId: "c1",
          })}
        />
      );

      screen.getByRole("button", { name: /request draw/i }).click();
      expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
      push.mockClear();

      screen.getByRole("button", { name: /surrender/i }).click();
      expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
      push.mockClear();

      screen.getByLabelText("Row 1, Column 1").click();
      expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
    });

    it("redirects on a viewer-kick/mute click", async () => {
      mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
      const push = vi.fn();
      mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

      render(<GameboardContainer initialMatch={makeMatch()} />);

      act(() => {
        handlers["match:viewer_joined"]?.({ matchId: "m1", viewerId: "v1", viewerUsername: "spectator1" });
      });
      await waitFor(() => expect(screen.getByRole("button", { name: /mute/i })).toBeInTheDocument());

      screen.getByRole("button", { name: /mute/i }).click();

      expect(muteMatchViewerActionMock).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
    });
  });

  describe("US2: waiting for opponent transitions live on match:player_joined", () => {
    it("swaps the waiting placeholder for the opponent's PlayerCard and shows the countdown, without a reload", async () => {
      mockedUseAuthSession.mockReturnValue({
        isSignedIn: true,
        account: { id: "c1", email: "c@b.com", username: "creator", avatarUrl: "" },
        refresh: vi.fn(),
        logout: vi.fn(),
      });
      const deadlineAt = new Date(Date.now() + 15_000).toISOString();
      getMatchActionMock.mockResolvedValue({
        ok: true,
        statusCode: 200,
        message: "ok",
        data: makeMatch({
          status: "waiting_for_start",
          playerO: { id: "p2", username: "bob", elo: 1400, winRate: 0.4 },
          deadlineAt,
        }),
      });

      render(<GameboardContainer initialMatch={makeMatch()} />);

      expect(screen.getByText("Waiting for opponent…")).toBeInTheDocument();

      act(() => {
        handlers["match:player_joined"]?.({
          matchId: "m1",
          joinerId: "p2",
          playerXId: "c1",
          playerOId: "p2",
          deadlineAt,
        });
      });

      await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
      expect(screen.queryByText("Waiting for opponent…")).not.toBeInTheDocument();
      expect(screen.getByTestId("gameboard-state-2")).toBeInTheDocument();
      expect(screen.getByText(/starts in/i)).toBeInTheDocument();
      expect(getMatchActionMock).toHaveBeenCalledWith("m1");
    });
  });

  describe("US3: start / auto-cancel", () => {
    function stateTwoMatch() {
      return makeMatch({
        status: "waiting_for_start",
        playerO: { id: "p2", username: "bob", elo: 1400, winRate: 0.4 },
        deadlineAt: new Date(Date.now() + 10_000).toISOString(),
      });
    }

    it("the creator's Start click calls startMatchAction", () => {
      mockedUseAuthSession.mockReturnValue({
        isSignedIn: true,
        account: { id: "c1", email: "c@b.com", username: "creator", avatarUrl: "" },
        refresh: vi.fn(),
        logout: vi.fn(),
      });

      render(<GameboardContainer initialMatch={stateTwoMatch()} />);

      screen.getByRole("button", { name: /start/i }).click();

      expect(startMatchActionMock).toHaveBeenCalledWith("m1");
    });

    it("the non-creator participant's Start click makes no call (disabled control)", () => {
      mockedUseAuthSession.mockReturnValue({
        isSignedIn: true,
        account: { id: "p2", email: "p2@b.com", username: "bob", avatarUrl: "" },
        refresh: vi.fn(),
        logout: vi.fn(),
      });

      render(<GameboardContainer initialMatch={stateTwoMatch()} />);

      const button = screen.getByRole("button", { name: /start/i }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      button.click();

      expect(startMatchActionMock).not.toHaveBeenCalled();
    });

    it("a mocked match:started event transitions to state 3", async () => {
      mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });

      render(<GameboardContainer initialMatch={stateTwoMatch()} />);

      act(() => {
        handlers["match:started"]?.({
          matchId: "m1",
          currentTurnPlayerId: "c1",
          deadlineAt: new Date(Date.now() + 15_000).toISOString(),
        });
      });

      await waitFor(() => expect(screen.getByTestId("gameboard-state-3")).toBeInTheDocument());
      expect(screen.getByRole("button", { name: /request draw/i })).toBeInTheDocument();
    });

    it("a mocked match:cancelled event (no prior match:started) transitions to state 4", async () => {
      mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });

      render(<GameboardContainer initialMatch={stateTwoMatch()} />);

      act(() => {
        handlers["match:cancelled"]?.({ matchId: "m1", reason: "start_window_expired" });
      });

      await waitFor(() => expect(screen.getByTestId("gameboard-state-4")).toBeInTheDocument());
      expect(screen.getByRole("button", { name: /review moves/i })).toBeInTheDocument();
    });
  });
});
