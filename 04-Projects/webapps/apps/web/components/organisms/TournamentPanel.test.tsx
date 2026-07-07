import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname } from "next/navigation";
import { TournamentPanel } from "./TournamentPanel";

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const gameConfigs = [{ id: "cfg1", boardSize: "18x18" as const, moveTimeSeconds: 15 as const, createdAt: "" }];

describe("TournamentPanel", () => {
  beforeEach(() => {
    vi.mocked(useAuthSession).mockReturnValue({ isSignedIn: true, refresh: vi.fn(), logout: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/game-caro");
  });

  it("renders the backend-provided title when present", () => {
    render(
      <TournamentPanel
        tournaments={[{ id: "t1", title: "Weekend Cup", gameConfigId: "cfg1", registeredCount: 3 }]}
        gameConfigs={gameConfigs}
      />
    );

    expect(screen.getByText("Weekend Cup")).toBeInTheDocument();
    expect(screen.getByText("3 registered")).toBeInTheDocument();
  });

  it("synthesizes a title from game type + min Elo when the backend omits one", () => {
    render(
      <TournamentPanel
        tournaments={[{ id: "t1", gameConfigId: "cfg1", minElo: 1200 }]}
        gameConfigs={gameConfigs}
      />
    );

    expect(screen.getByText("18×18 · 15s/move Tournament · min Elo 1200")).toBeInTheDocument();
  });

  it("shows an empty state when there are no tournaments", () => {
    render(<TournamentPanel tournaments={[]} gameConfigs={gameConfigs} />);

    expect(screen.getByText(/no upcoming tournaments/i)).toBeInTheDocument();
  });
});
