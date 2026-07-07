import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname } from "next/navigation";
import { QuickPairPanel } from "./QuickPairPanel";

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
vi.mock("@/lib/useCaroRealtime", () => ({
  useCaroRealtimeEvent: vi.fn(),
}));

describe("QuickPairPanel", () => {
  beforeEach(() => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/game-caro");
  });

  it("renders a card per active game config", () => {
    render(
      <QuickPairPanel
        gameConfigs={[
          { id: "cfg1", boardSize: "18x18", moveTimeSeconds: 15, createdAt: "" },
          { id: "cfg2", boardSize: "25x25", moveTimeSeconds: 35, createdAt: "" },
        ]}
      />
    );

    expect(screen.getByText("18×18 · 15s/move")).toBeInTheDocument();
    expect(screen.getByText("25×25 · 35s/move")).toBeInTheDocument();
  });

  it("shows an empty state when there are no game configs", () => {
    render(<QuickPairPanel gameConfigs={[]} />);

    expect(screen.getByText(/no game types available/i)).toBeInTheDocument();
  });

  it("shows a guest-safe fallback instead of an error when gameConfigs is null (401)", () => {
    render(<QuickPairPanel gameConfigs={null} />);

    expect(screen.getByText(/only available to signed-in players/i)).toBeInTheDocument();
  });
});
