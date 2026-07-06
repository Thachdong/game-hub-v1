import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/templates/Providers";
import { AppNav } from "./AppNav";

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockedUseAuthSession = vi.mocked(useAuthSession);
const mockedUseRouter = vi.mocked(useRouter);

describe("AppNav", () => {
  it("shows the 'Sign in' affordance when signed out", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: false,
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    render(<AppNav />);

    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
  });

  it("shows account info and a sign-out affordance when signed in", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    render(<AppNav />);

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("calls logout() and redirects to /login when signing out", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const push = vi.fn();
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
      refresh: vi.fn(),
      logout,
    });
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    render(<AppNav />);
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(logout).toHaveBeenCalledOnce();
  });
});
