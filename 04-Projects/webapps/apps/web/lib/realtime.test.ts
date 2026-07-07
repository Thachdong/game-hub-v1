import { describe, expect, it, vi } from "vitest";

const ioMock = vi.fn();

vi.mock("socket.io-client", () => ({
  io: ioMock,
}));

const { connectRealtime } = await import("./realtime.js");

describe("connectRealtime", () => {
  it("connects with the access token attached under auth.token when signed in", () => {
    ioMock.mockReturnValue({ on: vi.fn(), disconnect: vi.fn() });
    process.env.BACKEND_URL = "https://api.test";

    connectRealtime("token-123");

    expect(ioMock).toHaveBeenCalledWith("https://api.test", {
      path: "/realtime",
      auth: { token: "token-123" },
      transports: ["websocket"],
    });
  });

  it("connects with no auth.token (guest observer) when there is no access token", () => {
    ioMock.mockReturnValue({ on: vi.fn(), disconnect: vi.fn() });
    process.env.BACKEND_URL = "https://api.test";

    connectRealtime(null);

    expect(ioMock).toHaveBeenCalledWith("https://api.test", {
      path: "/realtime",
      auth: {},
      transports: ["websocket"],
    });
  });
});
