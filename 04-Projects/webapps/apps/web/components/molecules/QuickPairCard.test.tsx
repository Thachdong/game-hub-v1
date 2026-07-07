import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { requestQuickPairAction } from "@/lib/actions/caro";
import { QuickPairCard } from "./QuickPairCard";

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));
vi.mock("@/lib/actions/caro", () => ({
  requestQuickPairAction: vi.fn(),
}));

type MatchedHandler = (payload: { matchId: string }) => void;
let capturedHandler: MatchedHandler | undefined;
vi.mock("@/lib/useCaroRealtime", () => ({
  useCaroRealtimeEvent: (_eventName: string, handler: MatchedHandler) => {
    capturedHandler = handler;
  },
}));

describe("QuickPairCard", () => {
  it("renders the game type label", () => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/game-caro");

    render(<QuickPairCard configId="cfg1" boardSize="25x25" moveTimeSeconds={35} />);

    expect(screen.getByText("25×25 · 35s/move")).toBeInTheDocument();
  });

  it("redirects a signed-out click on Find Match to /login instead of calling requestQuickPair", () => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue("/game-caro");

    render(<QuickPairCard configId="cfg1" boardSize="25x25" moveTimeSeconds={35} />);

    fireEvent.click(screen.getByRole("button", { name: /find match/i }));

    expect(vi.mocked(requestQuickPairAction)).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro");
  });

  it("navigates immediately when requestQuickPair returns an immediate match", async () => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue("/game-caro");
    vi.mocked(requestQuickPairAction).mockResolvedValue({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: { status: "matched", requestId: null, matchId: "m1" },
    });

    render(<QuickPairCard configId="cfg1" boardSize="25x25" moveTimeSeconds={35} />);

    fireEvent.click(screen.getByRole("button", { name: /find match/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/game-caro/m1"));
  });

  it("waits, then navigates once quick_pair:matched fires over SSE", async () => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue("/game-caro");
    vi.mocked(requestQuickPairAction).mockResolvedValue({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: { status: "waiting", requestId: "r1", matchId: null },
    });

    render(<QuickPairCard configId="cfg1" boardSize="25x25" moveTimeSeconds={35} />);

    fireEvent.click(screen.getByRole("button", { name: /find match/i }));

    await waitFor(() => expect(screen.getByText(/waiting for match/i)).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();

    act(() => {
      capturedHandler?.({ matchId: "m2" });
    });

    expect(push).toHaveBeenCalledWith("/game-caro/m2");
  });
});
