import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MoveReplayControls } from "./MoveReplayControls";

describe("MoveReplayControls", () => {
  it("renders a Review Moves control (no sign-in gate) when not yet in replay mode", () => {
    const onReplayIndexChange = vi.fn();
    render(
      <MoveReplayControls totalMoves={5} replayIndex={null} onReplayIndexChange={onReplayIndexChange} />
    );

    screen.getByRole("button", { name: /review moves/i }).click();
    expect(onReplayIndexChange).toHaveBeenCalledWith(5);
  });

  it("renders prev/next stepping bounded to 0..totalMoves once in replay mode", () => {
    const onReplayIndexChange = vi.fn();
    render(
      <MoveReplayControls totalMoves={3} replayIndex={1} onReplayIndexChange={onReplayIndexChange} />
    );

    expect(screen.getByText("Move 1 / 3")).toBeInTheDocument();
    screen.getByRole("button", { name: /prev/i }).click();
    expect(onReplayIndexChange).toHaveBeenCalledWith(0);
    screen.getByRole("button", { name: /next/i }).click();
    expect(onReplayIndexChange).toHaveBeenCalledWith(2);
  });

  it("disables Prev at index 0 and Next at totalMoves", () => {
    const { rerender } = render(
      <MoveReplayControls totalMoves={3} replayIndex={0} onReplayIndexChange={vi.fn()} />
    );
    expect((screen.getByRole("button", { name: /prev/i }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<MoveReplayControls totalMoves={3} replayIndex={3} onReplayIndexChange={vi.fn()} />);
    expect((screen.getByRole("button", { name: /next/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
