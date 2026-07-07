import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { QuickPairCard } from "./QuickPairCard";

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

describe("QuickPairCard", () => {
  it("renders the game type label", () => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/game-caro");

    render(<QuickPairCard configId="cfg1" boardSize="25x25" moveTimeSeconds={35} />);

    expect(screen.getByText("25×25 · 35s/move")).toBeInTheDocument();
  });

  it("redirects a signed-out click on Find Match to /login instead of invoking onFindMatch", () => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue("/game-caro");
    const onFindMatch = vi.fn();

    render(<QuickPairCard configId="cfg1" boardSize="25x25" moveTimeSeconds={35} onFindMatch={onFindMatch} />);

    fireEvent.click(screen.getByRole("button", { name: /find match/i }));

    expect(onFindMatch).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro");
  });
});
