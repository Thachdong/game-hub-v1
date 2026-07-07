import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { ViewerList } from "./ViewerList";

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

describe("ViewerList", () => {
  it("renders nothing when there are no viewers (FR-011)", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const { container } = render(<ViewerList viewers={[]} isParticipant={false} onMute={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one row per viewer and calls onMute with the clicked entry's id for a participant", () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "p1", email: "a@b.com", username: "p1", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");
    const onMute = vi.fn();

    render(
      <ViewerList
        viewers={[
          { id: "v1", username: "bob" },
          { id: "v2", username: "carol" },
        ]}
        isParticipant={true}
        onMute={onMute}
      />
    );

    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("carol")).toBeInTheDocument();
    const muteButtons = screen.getAllByRole("button", { name: /mute/i });
    expect(muteButtons).toHaveLength(2);

    muteButtons[1].click();
    expect(onMute).toHaveBeenCalledWith("v2");
  });

  it("redirects a guest to login instead of calling onMute", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");
    const onMute = vi.fn();

    render(<ViewerList viewers={[{ id: "v1", username: "bob" }]} isParticipant={false} onMute={onMute} />);

    screen.getByRole("button", { name: /mute/i }).click();

    expect(onMute).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });
});
