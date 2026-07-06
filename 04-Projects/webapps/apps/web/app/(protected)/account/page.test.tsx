import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getCurrentAccountMock = vi.fn();
const listGamesMock = vi.fn();
const ensureAccountServiceConfiguredMock = vi.fn();

vi.mock("@game-hub/account-service", () => ({
  getCurrentAccount: getCurrentAccountMock,
  listGames: listGamesMock,
}));
vi.mock("@/lib/session", () => ({
  ACCESS_COOKIE_NAME: "access_token",
  ensureAccountServiceConfigured: ensureAccountServiceConfiguredMock,
}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));

const { default: AccountPage } = await import("./page.js");

const account = { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" };

describe("(protected)/account/page", () => {
  it("renders username/email/avatar", async () => {
    getCurrentAccountMock.mockResolvedValue({ ok: true, statusCode: 200, message: "ok", data: account });
    listGamesMock.mockResolvedValue({ ok: true, statusCode: 200, message: "ok", data: [] });

    render(await AccountPage());

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "alice" })).toHaveAttribute("src", "https://a");
  });

  it('shows "no profile yet" and zero cards when no game has hasProfile:true', async () => {
    getCurrentAccountMock.mockResolvedValue({ ok: true, statusCode: 200, message: "ok", data: account });
    listGamesMock.mockResolvedValue({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: [{ id: "g1", name: "Caro", slug: "caro", bannerUrl: "https://cdn.test/caro.png", hasProfile: false }],
    });

    render(await AccountPage());

    expect(screen.getByText(/no profile yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders exactly one card per hasProfile:true game, linking to its profile path", async () => {
    getCurrentAccountMock.mockResolvedValue({ ok: true, statusCode: 200, message: "ok", data: account });
    listGamesMock.mockResolvedValue({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: [
        { id: "g1", name: "Caro", slug: "caro", bannerUrl: "https://cdn.test/caro.png", hasProfile: true },
        { id: "g2", name: "Chess", slug: "chess", bannerUrl: "https://cdn.test/chess.png", hasProfile: false },
      ],
    });

    render(await AccountPage());

    expect(screen.queryByText(/no profile yet/i)).not.toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/game-caro/profile");
  });
});
