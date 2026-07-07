import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";

const getLeaderboardMock = vi.fn();
const listLobbyMatchesMock = vi.fn();
const listGameConfigsMock = vi.fn();
const listTournamentsMock = vi.fn();

vi.mock("@game-hub/caro-service", () => ({
  getLeaderboard: getLeaderboardMock,
  listLobbyMatches: listLobbyMatchesMock,
  listGameConfigs: listGameConfigsMock,
  listTournaments: listTournamentsMock,
}));

const ensureCaroServiceConfiguredMock = vi.fn();
const getSessionStatusMock = vi.fn();

vi.mock("@/lib/session", () => ({
  ACCESS_COOKIE_NAME: "access_token",
  ensureCaroServiceConfigured: ensureCaroServiceConfiguredMock,
  getSessionStatus: getSessionStatusMock,
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));
vi.mock("@/lib/useCaroRealtime", () => ({
  useCaroRealtimeEvent: vi.fn(),
}));

const { default: GameCaroPage } = await import("./page.js");

function ok<T>(data: T) {
  return { ok: true as const, statusCode: 200, message: "ok", data };
}

describe("(public)/game-caro/page", () => {
  it("renders all three tabs' read-only content and the leaderboard for a signed-out visitor, with gated actions redirecting to /login on click", async () => {
    const push = vi.fn();
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue("/game-caro");

    getSessionStatusMock.mockResolvedValue({ isSignedIn: false });
    getLeaderboardMock.mockResolvedValue(
      ok([{ rank: 1, playerId: "p1", elo: 2000, matchesPlayed: 1, wins: 1, losses: 0, draws: 0, winRate: 1 }])
    );
    listLobbyMatchesMock.mockResolvedValue(
      ok([
        {
          id: "m1",
          boardSize: "18x18",
          moveTimeSeconds: 15,
          status: "waiting",
          creatorUsername: "alice",
          secondPlayerUsername: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ])
    );
    listGameConfigsMock.mockResolvedValue(
      ok([{ id: "cfg1", boardSize: "18x18", moveTimeSeconds: 15, createdAt: "2026-01-01T00:00:00.000Z" }])
    );
    listTournamentsMock.mockResolvedValue(ok([{ id: "t1", title: "Weekend Cup", gameConfigId: "cfg1", registeredCount: 2 }]));

    render(await GameCaroPage());

    // Leaderboard always renders (right-hand slot), Lobby tab active by default
    expect(screen.getByText("Player p1")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /join/i }));
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro");

    fireEvent.click(screen.getByRole("tab", { name: "Tournament" }));
    expect(screen.getByText("Weekend Cup")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /register/i }));
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro");

    fireEvent.click(screen.getByRole("tab", { name: "Quick Pair" }));
    expect(screen.getByText("18×18 · 15s/move")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /find match/i }));
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro");
  });
});
