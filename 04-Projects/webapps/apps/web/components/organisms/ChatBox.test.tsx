import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";

const listMatchChatActionMock = vi.fn();
const sendMatchChatActionMock = vi.fn();

vi.mock("@/lib/actions/caro", () => ({
  listMatchChatAction: listMatchChatActionMock,
  sendMatchChatAction: sendMatchChatActionMock,
}));

type Handler = (payload: unknown) => void;
let capturedHandler: Handler | null = null;
const useCaroRealtimeEventMock = vi.fn((_eventName: string, handler: Handler, _matchId?: string) => {
  capturedHandler = handler;
});

vi.mock("@/lib/useCaroRealtime", () => ({
  useCaroRealtimeEvent: (eventName: string, handler: Handler, matchId?: string) =>
    useCaroRealtimeEventMock(eventName, handler, matchId),
}));

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

const { ChatBox } = await import("./ChatBox.js");

function ok<T>(data: T) {
  return { ok: true as const, statusCode: 200, message: "ok", data };
}

describe("ChatBox", () => {
  beforeEach(() => {
    listMatchChatActionMock.mockReset();
    sendMatchChatActionMock.mockReset();
    capturedHandler = null;
  });

  it("renders fetched history for a guest and redirects to login on send instead of calling sendMatchChat", async () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");
    listMatchChatActionMock.mockResolvedValue(
      ok([{ id: "c1", matchId: "m1", senderId: "p1", content: "hi", sentAt: "t" }])
    );

    render(<ChatBox matchId="m1" resolveSenderUsername={() => "alice"} />);

    await waitFor(() => expect(screen.getByText("hi")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Chat message"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(sendMatchChatActionMock).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
  });

  it("calls sendMatchChat for a signed-in viewer's send and clears the input", async () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "u1", email: "a@b.com", username: "alice", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");
    listMatchChatActionMock.mockResolvedValue(ok([]));
    sendMatchChatActionMock.mockResolvedValue(
      ok({ id: "c2", matchId: "m1", senderId: "u1", content: "hello", sentAt: "t" })
    );

    render(<ChatBox matchId="m1" resolveSenderUsername={() => "alice"} />);

    const input = screen.getByLabelText("Chat message") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(sendMatchChatActionMock).toHaveBeenCalledWith({ matchId: "m1", content: "hello" });
    expect(input.value).toBe("");
  });

  it("appends a mocked match:chat event to the rendered history without a refetch", async () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");
    listMatchChatActionMock.mockResolvedValue(ok([]));

    render(<ChatBox matchId="m1" resolveSenderUsername={() => "bob"} />);

    await waitFor(() => expect(listMatchChatActionMock).toHaveBeenCalledWith("m1"));

    capturedHandler?.({ id: "c3", matchId: "m1", senderId: "p2", content: "live message", sentAt: "t" });

    await waitFor(() => expect(screen.getByText("live message")).toBeInTheDocument());
    expect(listMatchChatActionMock).toHaveBeenCalledTimes(1);
  });
});
