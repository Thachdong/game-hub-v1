import { beforeEach, describe, expect, it, vi } from "vitest";

const clearAuthCookiesMock = vi.fn();

vi.mock("@/lib/session", () => ({
  clearAuthCookies: clearAuthCookiesMock,
}));

const { POST } = await import("./route.js");

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    clearAuthCookiesMock.mockReset();
  });

  it("clears both auth cookies and returns isSignedIn:false", async () => {
    const response = await POST();

    expect(clearAuthCookiesMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ isSignedIn: false });
  });
});
