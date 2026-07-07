import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";
import { GameBoard } from "./GameBoard";

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
      ? {
          isSignedIn: true,
          account: { ...account, email: "a@b.com", username: "a", avatarUrl: "" },
          refresh: vi.fn(),
          logout: vi.fn(),
        }
      : { isSignedIn: false, refresh: vi.fn(), logout: vi.fn() }
  );
  mockedUsePathname.mockReturnValue("/game-caro/m1");
}

describe("GameBoard", () => {
  it("renders a grid sized to boardSize (rows x cols) for each BoardSize", () => {
    setup(null);
    const { unmount } = render(
      <GameBoard boardSize="18x18" moves={[]} playerXId={null} playerOId={null} />
    );
    expect(screen.getAllByRole("gridcell")).toHaveLength(18 * 18);
    unmount();

    render(<GameBoard boardSize="3x3" moves={[]} playerXId={null} playerOId={null} />);
    expect(screen.getAllByRole("gridcell")).toHaveLength(9);
  });

  it("renders each recorded move as X or O for the corresponding player", () => {
    setup(null);
    render(
      <GameBoard
        boardSize="3x3"
        moves={[
          { playerId: "x1", row: 0, col: 0, sequenceNumber: 1, placedAt: "t" },
          { playerId: "o1", row: 1, col: 1, sequenceNumber: 2, placedAt: "t" },
        ]}
        playerXId="x1"
        playerOId="o1"
      />
    );

    expect(screen.getByLabelText("Row 1, Column 1, X")).toBeInTheDocument();
    expect(screen.getByLabelText("Row 2, Column 2, O")).toBeInTheDocument();
  });

  it("truncates the rendered board to replayIndex", () => {
    setup(null);
    render(
      <GameBoard
        boardSize="3x3"
        moves={[
          { playerId: "x1", row: 0, col: 0, sequenceNumber: 1, placedAt: "t" },
          { playerId: "o1", row: 1, col: 1, sequenceNumber: 2, placedAt: "t" },
        ]}
        playerXId="x1"
        playerOId="o1"
        replayIndex={1}
      />
    );

    expect(screen.getByLabelText("Row 1, Column 1, X")).toBeInTheDocument();
    expect(screen.getByLabelText("Row 2, Column 2")).toBeInTheDocument();
  });

  it("disables every cell when not interactive (default), regardless of sign-in", () => {
    setup(null);
    render(<GameBoard boardSize="2x2" moves={[]} playerXId={null} playerOId={null} />);

    const cell = screen.getByLabelText("Row 1, Column 1") as HTMLButtonElement;
    expect(cell.disabled).toBe(true);
  });

  it("disables an already-occupied cell even when interactive", () => {
    setup({ id: "x1" });
    render(
      <GameBoard
        boardSize="2x2"
        moves={[{ playerId: "x1", row: 0, col: 0, sequenceNumber: 1, placedAt: "t" }]}
        playerXId="x1"
        playerOId="o1"
        interactive
        currentTurnPlayerId="x1"
        onCellClick={vi.fn()}
      />
    );

    const cell = screen.getByLabelText("Row 1, Column 1, X") as HTMLButtonElement;
    expect(cell.disabled).toBe(true);
  });

  it("redirects a guest to login on an empty-cell click instead of calling onCellClick (FR-013)", () => {
    setup(null);
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const onCellClick = vi.fn();

    render(
      <GameBoard
        boardSize="2x2"
        moves={[]}
        playerXId="x1"
        playerOId="o1"
        interactive
        currentTurnPlayerId="x1"
        onCellClick={onCellClick}
      />
    );

    const cell = screen.getByLabelText("Row 1, Column 1") as HTMLButtonElement;
    expect(cell.disabled).toBe(false);
    cell.click();

    expect(onCellClick).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });

  it("redirects a signed-in non-participant spectator instead of calling onCellClick", () => {
    setup({ id: "spectator1" });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const onCellClick = vi.fn();

    render(
      <GameBoard
        boardSize="2x2"
        moves={[]}
        playerXId="x1"
        playerOId="o1"
        interactive
        currentTurnPlayerId="x1"
        onCellClick={onCellClick}
      />
    );

    screen.getByLabelText("Row 1, Column 1").click();

    expect(onCellClick).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });

  it("disables cells with no redirect for a signed-in participant when it isn't their turn", () => {
    setup({ id: "o1" });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const onCellClick = vi.fn();

    render(
      <GameBoard
        boardSize="2x2"
        moves={[]}
        playerXId="x1"
        playerOId="o1"
        interactive
        currentTurnPlayerId="x1"
        onCellClick={onCellClick}
      />
    );

    const cell = screen.getByLabelText("Row 1, Column 1") as HTMLButtonElement;
    expect(cell.disabled).toBe(true);
  });

  it("calls onCellClick with row/col for the current-turn participant's empty-cell click", () => {
    setup({ id: "x1" });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    const onCellClick = vi.fn();

    render(
      <GameBoard
        boardSize="2x2"
        moves={[]}
        playerXId="x1"
        playerOId="o1"
        interactive
        currentTurnPlayerId="x1"
        onCellClick={onCellClick}
      />
    );

    screen.getByLabelText("Row 1, Column 1").click();

    expect(onCellClick).toHaveBeenCalledWith(0, 0);
    expect(push).not.toHaveBeenCalled();
  });
});
