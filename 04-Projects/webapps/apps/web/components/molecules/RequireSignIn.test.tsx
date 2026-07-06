import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { RequireSignIn } from "./RequireSignIn";

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

describe("RequireSignIn", () => {
  it("prompts sign-in (redirects to /login) instead of invoking the action for an anonymous visitor (FR-009)", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");

    const onAction = vi.fn();
    render(
      <RequireSignIn onAction={onAction}>
        {({ onClick }) => <button onClick={onClick}>Join</button>}
      </RequireSignIn>
    );

    fireEvent.click(screen.getByRole("button", { name: /join/i }));

    expect(onAction).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });

  it("invokes the action for a signed-in visitor without redirecting", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");

    const onAction = vi.fn();
    render(
      <RequireSignIn onAction={onAction}>
        {({ onClick }) => <button onClick={onClick}>Join</button>}
      </RequireSignIn>
    );

    fireEvent.click(screen.getByRole("button", { name: /join/i }));

    expect(onAction).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });
});
