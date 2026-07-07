import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { joinMatchAction } from "@/lib/actions/caro";
import { LobbyMatchCard } from "./LobbyMatchCard";

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock("@/lib/actions/caro", () => ({
  joinMatchAction: vi.fn(),
}));

const mockedUseAuthSession = vi.mocked(useAuthSession);
const mockedUseRouter = vi.mocked(useRouter);
const mockedUsePathname = vi.mocked(usePathname);
const mockedJoinMatchAction = vi.mocked(joinMatchAction);

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

  it("redirects a signed-out click on Join to /login instead of calling joinMatch", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro");

    render(
      <LobbyMatchCard id="m1" creatorUsername="alice" creatorElo={1500} boardSize="18x18" moveTimeSeconds={15} />
    );

    fireEvent.click(screen.getByRole("button", { name: /join/i }));

    expect(mockedJoinMatchAction).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro");
  });

  it("calls joinMatch and navigates to the match view on a signed-in click (US2)", async () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro");
    mockedJoinMatchAction.mockResolvedValue({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: { matchId: "m1", status: "in_progress" },
    });

    render(
      <LobbyMatchCard id="m1" creatorUsername="alice" creatorElo={1500} boardSize="18x18" moveTimeSeconds={15} />
    );

    fireEvent.click(screen.getByRole("button", { name: /join/i }));

    expect(mockedJoinMatchAction).toHaveBeenCalledWith("m1");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/game-caro/m1"));
  });
});
