import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMatchAction } from "@/lib/actions/caro";
import { CreateGameModal } from "./CreateGameModal";

vi.mock("@/lib/actions/caro", () => ({
  createMatchAction: vi.fn(),
}));

const mockedCreateMatchAction = vi.mocked(createMatchAction);

const gameConfigs = [
  { id: "cfg1", boardSize: "18x18" as const, moveTimeSeconds: 15 as const, createdAt: "" },
  { id: "cfg2", boardSize: "25x25" as const, moveTimeSeconds: 35 as const, createdAt: "" },
];

describe("CreateGameModal", () => {
  beforeEach(() => {
    mockedCreateMatchAction.mockReset();
  });

  it("lets the player pick a game type and visibility, then submits createMatch with the selection", async () => {
    mockedCreateMatchAction.mockResolvedValue({
      ok: true,
      statusCode: 201,
      message: "ok",
      data: {
        id: "m1",
        configId: "cfg2",
        boardSize: "25x25",
        moveTimeSeconds: 35,
        visibility: "private",
        status: "waiting",
        creatorId: "u1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    const onCreated = vi.fn();
    const onClose = vi.fn();

    render(<CreateGameModal gameConfigs={gameConfigs} onClose={onClose} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/game type/i), { target: { value: "cfg2" } });
    fireEvent.change(screen.getByLabelText(/visibility/i), { target: { value: "private" } });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(mockedCreateMatchAction).toHaveBeenCalledWith({ configId: "cfg2", visibility: "private" });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "m1" })));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose without submitting when Cancel is clicked", () => {
    const onClose = vi.fn();

    render(<CreateGameModal gameConfigs={gameConfigs} onClose={onClose} onCreated={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(mockedCreateMatchAction).not.toHaveBeenCalled();
  });
});
