import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchState } from "@game-hub/caro-service";
import { useAuthSession } from "@/components/templates/Providers";

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
  ReportPlayerForm: ({ reportedUserId }: { reportedUserId: string }) => (
    <button type="button">{`Report ${reportedUserId}`}</button>
  ),
}));

const mockedUseAuthSession = vi.mocked(useAuthSession);

const { GameboardSidePanel } = await import("./GameboardSidePanel.js");

function makeMatch(overrides: Partial<MatchState> = {}): MatchState {
  return {
    id: "m1",
    boardSize: "18x18",
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

function noopHandlers() {
  return {
    onMute: vi.fn(),
    onReplayIndexChange: vi.fn(),
    onStart: vi.fn(),
    onRequestDraw: vi.fn(),
    onSurrender: vi.fn(),
    onRespondToDraw: vi.fn(),
  };
}

describe("GameboardSidePanel", () => {
  beforeEach(() => {
    mockedUseAuthSession.mockReset();
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
  });

  it("state 1: shows own card, waiting placeholder, and chat", () => {
    render(
      <GameboardSidePanel match={makeMatch()} viewers={[]} replayIndex={null} {...noopHandlers()} />
    );

    expect(screen.getByTestId("gameboard-state-1")).toBeInTheDocument();
    expect(screen.getByText("creator")).toBeInTheDocument();
    expect(screen.getByText("Waiting for opponent…")).toBeInTheDocument();
    expect(screen.getByTestId("chat-box")).toBeInTheDocument();
  });

  it("state 1: falls back to a synthesized own card from creatorId when playerX is null (real backend shape before a second player joins)", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "c1", email: "c@b.com", username: "creator", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <GameboardSidePanel
        match={makeMatch({ playerX: null })}
        viewers={[]}
        replayIndex={null}
        {...noopHandlers()}
      />
    );

    expect(screen.getByText("creator (You)")).toBeInTheDocument();
  });

  it("state 1: shows a shortened-id fallback card for a viewer who isn't the creator, when playerX is null", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "spectator1", email: "s@b.com", username: "spec", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <GameboardSidePanel
        match={makeMatch({ playerX: null })}
        viewers={[]}
        replayIndex={null}
        {...noopHandlers()}
      />
    );

    expect(screen.getByText("Player c1")).toBeInTheDocument();
  });

  it("state 2: shows both cards and the Start countdown", () => {
    render(
      <GameboardSidePanel
        match={makeMatch({
          status: "waiting_for_start",
          playerO: { id: "p2", username: "bob", elo: 1400, winRate: 0.4 },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        })}
        viewers={[]}
        replayIndex={null}
        {...noopHandlers()}
      />
    );

    expect(screen.getByTestId("gameboard-state-2")).toBeInTheDocument();
    expect(screen.getByText("creator")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText(/starts in/i)).toBeInTheDocument();
  });

  it("state 3: shows both cards and InGameActions", () => {
    render(
      <GameboardSidePanel
        match={makeMatch({
          status: "in_progress",
          playerO: { id: "p2", username: "bob", elo: 1400, winRate: 0.4 },
        })}
        viewers={[]}
        replayIndex={null}
        {...noopHandlers()}
      />
    );

    expect(screen.getByTestId("gameboard-state-3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request draw/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /surrender/i })).toBeInTheDocument();
  });

  it("state 4: shows both cards and MoveReplayControls", () => {
    render(
      <GameboardSidePanel
        match={makeMatch({
          status: "completed",
          playerO: { id: "p2", username: "bob", elo: 1400, winRate: 0.4 },
          moves: [{ playerId: "c1", row: 0, col: 0, sequenceNumber: 1, placedAt: "t" }],
        })}
        viewers={[]}
        replayIndex={null}
        {...noopHandlers()}
      />
    );

    expect(screen.getByTestId("gameboard-state-4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review moves/i })).toBeInTheDocument();
  });

  it("renders a Report control next to a non-self player card but not the viewer's own", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "c1", email: "c@b.com", username: "creator", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <GameboardSidePanel
        match={makeMatch({
          status: "in_progress",
          playerO: { id: "p2", username: "bob", elo: 1400, winRate: 0.4 },
        })}
        viewers={[]}
        replayIndex={null}
        {...noopHandlers()}
      />
    );

    expect(screen.getByText("Report p2")).toBeInTheDocument();
    expect(screen.queryByText("Report c1")).not.toBeInTheDocument();
  });

  it("renders the viewer list when non-empty, with mute controls only when the current viewer is a participant", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "c1", email: "c@b.com", username: "creator", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <GameboardSidePanel
        match={makeMatch()}
        viewers={[{ id: "v1", username: "spectator1" }]}
        replayIndex={null}
        {...noopHandlers()}
      />
    );

    expect(screen.getByText("spectator1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mute/i })).toBeInTheDocument();
  });

  it("still shows the mute control for a guest (FR-013) but its click redirects rather than calling onMute", () => {
    const onMute = vi.fn();
    render(
      <GameboardSidePanel
        match={makeMatch()}
        viewers={[{ id: "v1", username: "spectator1" }]}
        replayIndex={null}
        {...noopHandlers()}
        onMute={onMute}
      />
    );

    expect(screen.getByText("spectator1")).toBeInTheDocument();
    screen.getByRole("button", { name: /mute/i }).click();
    expect(onMute).not.toHaveBeenCalled();
  });
});
