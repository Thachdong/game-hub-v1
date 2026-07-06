import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameGrid } from "./GameGrid";

describe("GameGrid", () => {
  it("renders one GameCard per item in a non-empty games prop", () => {
    render(
      <GameGrid
        games={[
          { name: "Caro", bannerUrl: "https://cdn.test/caro.png", href: "/game-caro" },
          { name: "Chess", bannerUrl: "https://cdn.test/chess.png", href: "/game-chess" },
        ]}
        emptyMessage="No games available"
      />
    );

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /caro/i })).toHaveAttribute("href", "/game-caro");
    expect(screen.getByRole("link", { name: /chess/i })).toHaveAttribute("href", "/game-chess");
  });

  it("renders EmptyState instead when games is empty", () => {
    render(<GameGrid games={[]} emptyMessage="No games available" />);

    expect(screen.getByText("No games available")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
