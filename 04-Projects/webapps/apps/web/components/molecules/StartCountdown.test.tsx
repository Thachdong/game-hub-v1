import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { StartCountdown } from "./StartCountdown";

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

const NOW = new Date("2026-01-01T00:00:00.000Z").getTime();

describe("StartCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockedUsePathname.mockReturnValue("/game-caro/m1");
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("displays the remaining time derived from deadlineAt, not the render moment", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });

    render(
      <StartCountdown
        deadlineAt={new Date(NOW + 10_000).toISOString()}
        creatorId="creator1"
        playerXId="creator1"
        playerOId="p2"
        onStart={vi.fn()}
      />
    );

    expect(screen.getByText("Starts in 10s")).toBeInTheDocument();
  });

  it("redirects a guest to login instead of calling onStart", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const onStart = vi.fn();

    render(
      <StartCountdown
        deadlineAt={new Date(NOW + 10_000).toISOString()}
        creatorId="creator1"
        playerXId="creator1"
        playerOId="p2"
        onStart={onStart}
      />
    );

    screen.getByRole("button", { name: /start/i }).click();

    expect(onStart).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });

  it("redirects a signed-in non-participant spectator to login instead of calling onStart", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "spectator1", email: "s@b.com", username: "spec", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const onStart = vi.fn();

    render(
      <StartCountdown
        deadlineAt={new Date(NOW + 10_000).toISOString()}
        creatorId="creator1"
        playerXId="creator1"
        playerOId="p2"
        onStart={onStart}
      />
    );

    screen.getByRole("button", { name: /start/i }).click();

    expect(onStart).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });

  it("renders a visibly disabled Start control for the non-creator participant, with no redirect", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "p2", email: "p2@b.com", username: "p2", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const onStart = vi.fn();

    render(
      <StartCountdown
        deadlineAt={new Date(NOW + 10_000).toISOString()}
        creatorId="creator1"
        playerXId="creator1"
        playerOId="p2"
        onStart={onStart}
      />
    );

    const button = screen.getByRole("button", { name: /start/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(onStart).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("invokes onStart for the creator's click, without redirecting", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "creator1", email: "c@b.com", username: "creator", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const onStart = vi.fn();

    render(
      <StartCountdown
        deadlineAt={new Date(NOW + 10_000).toISOString()}
        creatorId="creator1"
        playerXId="creator1"
        playerOId="p2"
        onStart={onStart}
      />
    );

    screen.getByRole("button", { name: /start/i }).click();

    expect(onStart).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });
});
