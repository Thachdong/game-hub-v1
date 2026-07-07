import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { LobbyMatchCard } from "./LobbyMatchCard";

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const mockedUseAuthSession = vi.mocked(useAuthSession);
const mockedUseRouter = vi.mocked(useRouter);
const mockedUsePathname = vi.mocked(usePathname);

describe("LobbyMatchCard", () => {
  it("renders the Elo badge when creatorElo is present", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    mockedUsePathname.mockReturnValue("/game-caro");

    render(
      <LobbyMatchCard id="m1" creatorUsername="alice" creatorElo={1500} boardSize="18x18" moveTimeSeconds={15} />
    );

    expect(screen.getByText("1500 Elo")).toBeInTheDocument();
  });

  it("omits the Elo badge when creatorElo is null (pending backend)", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    mockedUsePathname.mockReturnValue("/game-caro");

    render(
      <LobbyMatchCard id="m1" creatorUsername="alice" creatorElo={null} boardSize="18x18" moveTimeSeconds={15} />
    );

    expect(screen.queryByText(/Elo/)).not.toBeInTheDocument();
  });

  it("redirects a signed-out click on Join to /login instead of invoking onJoin", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro");
    const onJoin = vi.fn();

    render(
      <LobbyMatchCard
        id="m1"
        creatorUsername="alice"
        creatorElo={1500}
        boardSize="18x18"
        moveTimeSeconds={15}
        onJoin={onJoin}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /join/i }));

    expect(onJoin).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro");
  });
});
