import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { RequireSignIn } from "./RequireSignIn";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const mockedUseSession = vi.mocked(useSession);
const mockedUseRouter = vi.mocked(useRouter);
const mockedUsePathname = vi.mocked(usePathname);

describe("RequireSignIn", () => {
  it("prompts sign-in (redirects to /login) instead of invoking the action for an anonymous visitor (FR-009)", () => {
    mockedUseSession.mockReturnValue({ data: null, status: "unauthenticated" } as ReturnType<
      typeof useSession
    >);
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
    mockedUseSession.mockReturnValue({
      data: {
        account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
        accessToken: "token",
        expires: "2099-01-01",
      },
      status: "authenticated",
    } as ReturnType<typeof useSession>);
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

  it("treats a RefreshFailed session as anonymous and still prompts sign-in (FR-004)", () => {
    mockedUseSession.mockReturnValue({
      data: {
        account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
        accessToken: "stale",
        error: "RefreshFailed",
        expires: "2099-01-01",
      },
      status: "authenticated",
    } as ReturnType<typeof useSession>);
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");

    const onAction = vi.fn();
    render(
      <RequireSignIn onAction={onAction}>
        {({ onClick }) => <button onClick={onClick}>Play</button>}
      </RequireSignIn>
    );

    fireEvent.click(screen.getByRole("button", { name: /play/i }));

    expect(onAction).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });
});
