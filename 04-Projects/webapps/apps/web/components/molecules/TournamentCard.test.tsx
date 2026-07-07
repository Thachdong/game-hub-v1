import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { TournamentCard } from "./TournamentCard";

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

  it("redirects a signed-out click on Register to /login instead of invoking onRegister", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro");
    const onRegister = vi.fn();

    render(
      <TournamentCard
        id="t1"
        title="Weekend Cup"
        gameType="18×18 · 15s/move"
        startAt="2026-08-01T10:00:00.000Z"
        registeredCount={4}
        onRegister={onRegister}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(onRegister).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro");
  });
});
