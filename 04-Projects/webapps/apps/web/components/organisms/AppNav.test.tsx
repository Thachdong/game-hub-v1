import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSession } from "next-auth/react";
import { AppNav } from "./AppNav";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

const mockedUseSession = vi.mocked(useSession);

describe("AppNav", () => {
  it("shows the 'Sign in' affordance when unauthenticated", () => {
    mockedUseSession.mockReturnValue({ data: null, status: "unauthenticated" } as ReturnType<
      typeof useSession
    >);

    render(<AppNav />);

    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
  });

  it("shows account info and a sign-out affordance when authenticated with no error", () => {
    mockedUseSession.mockReturnValue({
      data: {
        account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
        accessToken: "token",
        expires: "2099-01-01",
      },
      status: "authenticated",
    } as ReturnType<typeof useSession>);

    render(<AppNav />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("shows the 'Sign in' affordance when authenticated but session.error is RefreshFailed (FR-004)", () => {
    mockedUseSession.mockReturnValue({
      data: {
        account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
        accessToken: "token",
        error: "RefreshFailed",
        expires: "2099-01-01",
      },
      status: "authenticated",
    } as ReturnType<typeof useSession>);

    render(<AppNav />);

    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText("alice")).not.toBeInTheDocument();
  });

  it("shows a loading skeleton while session status is resolving (FR-012)", () => {
    mockedUseSession.mockReturnValue({ data: null, status: "loading" } as ReturnType<
      typeof useSession
    >);

    render(<AppNav />);

    expect(screen.getByRole("status", { name: /loading sign-in state/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });
});
