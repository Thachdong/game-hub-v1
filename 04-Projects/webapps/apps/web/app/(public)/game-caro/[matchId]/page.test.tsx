import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getMatchMock = vi.fn();

vi.mock("@game-hub/caro-service", () => ({
  getMatch: getMatchMock,
}));

const ensureCaroServiceConfiguredMock = vi.fn();

vi.mock("@/lib/session", () => ({
  ACCESS_COOKIE_NAME: "access_token",
  ensureCaroServiceConfigured: ensureCaroServiceConfiguredMock,
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(() => ({ isSignedIn: false })),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/game-caro/m1"),
}));
vi.mock("@/lib/useCaroRealtime", () => ({
  useCaroRealtimeEvent: vi.fn(),
}));

const { default: GameCaroDetailPage } = await import("./page.js");

function makeMatch(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "m1",
    boardSize: "18x18",
    moveTimeSeconds: 15,
    visibility: "public",
    status: "looking_for_opponent",
    creatorId: "c1",
    playerX: { id: "c1", username: "alice", elo: 1500, winRate: 0.5 },
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
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("(public)/game-caro/[matchId]/page", () => {
  it("renders the board and side panel containers for a successful fetch", async () => {
    getMatchMock.mockResolvedValue({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: makeMatch(),
    });

    render(await GameCaroDetailPage({ params: Promise.resolve({ matchId: "m1" }) }));

    expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0);
    expect(screen.getByTestId("gameboard-state-1")).toBeInTheDocument();
  });

  it("renders a not-found message when getMatch fails", async () => {
    getMatchMock.mockResolvedValue({
      ok: false,
      reason: "NOT_FOUND",
      statusCode: 404,
      message: "not found",
    });

    render(await GameCaroDetailPage({ params: Promise.resolve({ matchId: "missing" }) }));

    expect(screen.getByText("Match not found.")).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });
});
