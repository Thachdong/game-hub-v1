import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { InGameActions } from "./InGameActions";

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

function setup(account: { id: string } | null) {
  mockedUseAuthSession.mockReturnValue(
    account
      ? { isSignedIn: true, account: { ...account, email: "a@b.com", username: "a", avatarUrl: "" }, refresh: vi.fn(), logout: vi.fn() }
      : { isSignedIn: false, refresh: vi.fn(), logout: vi.fn() }
  );
  mockedUsePathname.mockReturnValue("/game-caro/m1");
}

describe("InGameActions", () => {
  it("redirects a guest to login on Request Draw or Surrender", () => {
    setup(null);
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const onRequestDraw = vi.fn();

    render(
      <InGameActions
        playerXId="p1"
        playerOId="p2"
        pendingDrawRequestFromId={null}
        onRequestDraw={onRequestDraw}
        onSurrender={vi.fn()}
        onRespondToDraw={vi.fn()}
      />
    );

    screen.getByRole("button", { name: /request draw/i }).click();

    expect(onRequestDraw).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });

  it("redirects a signed-in non-participant spectator instead of invoking the callback", () => {
    setup({ id: "spectator1" });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const onSurrender = vi.fn();

    render(
      <InGameActions
        playerXId="p1"
        playerOId="p2"
        pendingDrawRequestFromId={null}
        onRequestDraw={vi.fn()}
        onSurrender={onSurrender}
        onRespondToDraw={vi.fn()}
      />
    );

    screen.getByRole("button", { name: /surrender/i }).click();

    expect(onSurrender).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });

  it("invokes onRequestDraw/onSurrender for a participant's click with no pending request", () => {
    setup({ id: "p1" });
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    const onRequestDraw = vi.fn();
    const onSurrender = vi.fn();

    render(
      <InGameActions
        playerXId="p1"
        playerOId="p2"
        pendingDrawRequestFromId={null}
        onRequestDraw={onRequestDraw}
        onSurrender={onSurrender}
        onRespondToDraw={vi.fn()}
      />
    );

    screen.getByRole("button", { name: /request draw/i }).click();
    screen.getByRole("button", { name: /surrender/i }).click();

    expect(onRequestDraw).toHaveBeenCalledOnce();
    expect(onSurrender).toHaveBeenCalledOnce();
  });

  it("renders the accept/decline variant for the recipient of a pending draw request", () => {
    setup({ id: "p2" });
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    const onRespondToDraw = vi.fn();

    render(
      <InGameActions
        playerXId="p1"
        playerOId="p2"
        pendingDrawRequestFromId="p1"
        onRequestDraw={vi.fn()}
        onSurrender={vi.fn()}
        onRespondToDraw={onRespondToDraw}
      />
    );

    expect(screen.queryByRole("button", { name: /^request draw$/i })).not.toBeInTheDocument();
    screen.getByRole("button", { name: /accept draw/i }).click();
    expect(onRespondToDraw).toHaveBeenCalledWith("accept");

    screen.getByRole("button", { name: /decline draw/i }).click();
    expect(onRespondToDraw).toHaveBeenCalledWith("decline");
  });

  it("disables Request Draw (without accept/decline) for the requester while their own request is pending", () => {
    setup({ id: "p1" });
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    render(
      <InGameActions
        playerXId="p1"
        playerOId="p2"
        pendingDrawRequestFromId="p1"
        onRequestDraw={vi.fn()}
        onSurrender={vi.fn()}
        onRespondToDraw={vi.fn()}
      />
    );

    const button = screen.getByRole("button", { name: /draw requested/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
