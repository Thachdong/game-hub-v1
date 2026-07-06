import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const listGamesMock = vi.fn();
const ensureAccountServiceConfiguredMock = vi.fn();

vi.mock("@game-hub/account-service", () => ({ listGames: listGamesMock }));
vi.mock("@/lib/session", () => ({
  ACCESS_COOKIE_NAME: "access_token",
  ensureAccountServiceConfigured: ensureAccountServiceConfiguredMock,
}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));

const { default: GamesListPage } = await import("./page.js");

describe("(public)/page", () => {
  it("renders a GameGrid populated from listGames' result", async () => {
    listGamesMock.mockResolvedValue({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: [{ id: "g1", name: "Caro", slug: "caro", bannerUrl: "https://cdn.test/caro.png" }],
    });

    render(await GamesListPage());

    const link = screen.getByRole("link", { name: /caro/i });
    expect(link).toHaveAttribute("href", "/game-caro");
  });

  it("renders the empty-state path when listGames' result is empty", async () => {
    listGamesMock.mockResolvedValue({ ok: true, statusCode: 200, message: "ok", data: [] });

    render(await GamesListPage());

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/no games/i)).toBeInTheDocument();
  });
});
