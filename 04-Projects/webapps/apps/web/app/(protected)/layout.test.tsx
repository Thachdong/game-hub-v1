import { describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const redirectMock = vi.fn();
const headersMock = vi.fn(async () => new Map([["x-pathname", "/account"]]));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/headers", () => ({
  headers: () => headersMock().then((m) => ({ get: (key: string) => m.get(key) ?? null })),
}));

const { default: ProtectedLayout } = await import("./layout.js");

describe("(protected)/layout", () => {
  it("redirects to /login?callbackUrl=<path> when there is no session (FR-006)", async () => {
    authMock.mockResolvedValue(null);
    redirectMock.mockClear();

    await ProtectedLayout({ children: "content" as unknown as React.ReactNode });

    expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=%2Faccount");
  });

  it("redirects to login when the session has error: 'RefreshFailed' (FR-004)", async () => {
    authMock.mockResolvedValue({
      account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
      accessToken: "stale",
      error: "RefreshFailed",
      expires: "2099-01-01",
    });
    redirectMock.mockClear();

    await ProtectedLayout({ children: "content" as unknown as React.ReactNode });

    expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=%2Faccount");
  });

  it("renders children without redirecting when a valid error-free session exists", async () => {
    authMock.mockResolvedValue({
      account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" },
      accessToken: "valid",
      expires: "2099-01-01",
    });
    redirectMock.mockClear();

    const result = await ProtectedLayout({ children: "content" as unknown as React.ReactNode });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
