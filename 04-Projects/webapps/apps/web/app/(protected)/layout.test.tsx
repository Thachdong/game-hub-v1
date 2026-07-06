import { describe, expect, it, vi } from "vitest";

const getSessionStatusMock = vi.fn();
const redirectMock = vi.fn();
const headersMock = vi.fn(async () => new Map([["x-pathname", "/account"]]));

vi.mock("@/lib/session", () => ({ getSessionStatus: getSessionStatusMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/headers", () => ({
  headers: () => headersMock().then((m) => ({ get: (key: string) => m.get(key) ?? null })),
}));

const { default: ProtectedLayout } = await import("./layout.js");

describe("(protected)/layout", () => {
  it("redirects to /login?callbackUrl=<path> when signed out (FR-006)", async () => {
    getSessionStatusMock.mockResolvedValue({ isSignedIn: false });
    redirectMock.mockClear();

    await ProtectedLayout({ children: "content" as unknown as React.ReactNode });

    expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=%2Faccount");
  });

  it("renders children without redirecting when signed in", async () => {
    getSessionStatusMock.mockResolvedValue({
      isSignedIn: true,
      account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
    });
    redirectMock.mockClear();

    const result = await ProtectedLayout({ children: "content" as unknown as React.ReactNode });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
