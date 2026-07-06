import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionStatusMock = vi.fn();

vi.mock("@/lib/session", () => ({
  getSessionStatus: getSessionStatusMock,
}));

const { GET } = await import("./route.js");

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    getSessionStatusMock.mockReset();
  });

  it("returns 200 with the signed-out shape", async () => {
    getSessionStatusMock.mockResolvedValue({ isSignedIn: false });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ isSignedIn: false });
  });

  it("returns 200 with the signed-in shape, and never a token field", async () => {
    const account = { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" };
    getSessionStatusMock.mockResolvedValue({ isSignedIn: true, account });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ isSignedIn: true, account });
    expect(JSON.stringify(body)).not.toMatch(/token/i);
  });
});
