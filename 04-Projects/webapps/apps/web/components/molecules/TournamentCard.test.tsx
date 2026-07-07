import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { registerForTournamentAction } from "@/lib/actions/caro";
import { TournamentCard } from "./TournamentCard";

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));
vi.mock("@/lib/actions/caro", () => ({
  registerForTournamentAction: vi.fn(),
}));

const mockedUseAuthSession = vi.mocked(useAuthSession);
const mockedUseRouter = vi.mocked(useRouter);
const mockedUsePathname = vi.mocked(usePathname);
const mockedRegisterForTournamentAction = vi.mocked(registerForTournamentAction);

describe("TournamentCard", () => {
  it("renders the synthesized fallback title when the backend doesn't provide one", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    mockedUsePathname.mockReturnValue("/game-caro");

    render(
      <TournamentCard
        id="t1"
        title="18×18 · 15s/move Tournament · min Elo 1200"
        gameType="18×18 · 15s/move"
        startAt="2026-08-01T10:00:00.000Z"
        registeredCount={4}
      />
    );

    expect(screen.getByText("18×18 · 15s/move Tournament · min Elo 1200")).toBeInTheDocument();
    expect(screen.getByText("4 registered")).toBeInTheDocument();
  });

  it("redirects a signed-out click on Register to /login instead of calling registerForTournament", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro");

    render(
      <TournamentCard
        id="t1"
        title="Weekend Cup"
        gameType="18×18 · 15s/move"
        startAt="2026-08-01T10:00:00.000Z"
        registeredCount={4}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(mockedRegisterForTournamentAction).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro");
  });

  it("calls registerForTournament and increments the displayed count on a signed-in click (US4)", async () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    mockedUsePathname.mockReturnValue("/game-caro");
    mockedRegisterForTournamentAction.mockResolvedValue({ ok: true, statusCode: 201, message: "ok", data: {} });

    render(
      <TournamentCard
        id="t1"
        title="Weekend Cup"
        gameType="18×18 · 15s/move"
        startAt="2026-08-01T10:00:00.000Z"
        registeredCount={4}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(mockedRegisterForTournamentAction).toHaveBeenCalledWith("t1");
    await waitFor(() => expect(screen.getByText("5 registered")).toBeInTheDocument());
  });
});
