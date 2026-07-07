import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { ViewerListItem } from "./ViewerListItem";

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

describe("ViewerListItem", () => {
  it("always renders the mute control (visible to every viewer per FR-013) and calls onMute for a participant", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "p1", email: "a@b.com", username: "p1", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");
    const onMute = vi.fn();

    render(<ViewerListItem username="bob" isParticipant={true} onMute={onMute} />);

    expect(screen.getByText("bob")).toBeInTheDocument();
    screen.getByRole("button", { name: /mute/i }).click();
    expect(onMute).toHaveBeenCalledOnce();
  });

  it("redirects a guest to login instead of calling onMute", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");
    const onMute = vi.fn();

    render(<ViewerListItem username="bob" isParticipant={false} onMute={onMute} />);

    screen.getByRole("button", { name: /mute/i }).click();

    expect(onMute).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });

  it("redirects a signed-in non-participant spectator to login instead of calling onMute (quickstart item 6)", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "spectator1", email: "s@b.com", username: "spec", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");
    const onMute = vi.fn();

    render(<ViewerListItem username="bob" isParticipant={false} onMute={onMute} />);

    screen.getByRole("button", { name: /mute/i }).click();

    expect(onMute).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });
});
