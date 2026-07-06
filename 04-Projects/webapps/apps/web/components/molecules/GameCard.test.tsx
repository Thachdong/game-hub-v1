import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameCard } from "./GameCard";

describe("GameCard", () => {
  it("renders the game's banner and name as a link to href", () => {
    render(<GameCard name="Caro" bannerUrl="https://cdn.test/caro.png" href="/game-caro" />);

    const link = screen.getByRole("link", { name: /caro/i });
    expect(link).toHaveAttribute("href", "/game-caro");
    expect(screen.getByRole("img", { name: "Caro" })).toHaveAttribute(
      "src",
      "https://cdn.test/caro.png"
    );
    expect(screen.getByText("Caro")).toBeInTheDocument();
  });

  it("still renders the name and stays a link when the banner image errors", () => {
    render(<GameCard name="Caro" bannerUrl="https://cdn.test/broken.png" href="/game-caro" />);

    fireEvent.error(screen.getByRole("img", { name: "Caro" }));

    expect(screen.getByRole("link", { name: /caro/i })).toHaveAttribute("href", "/game-caro");
    expect(screen.getByText("Caro")).toBeInTheDocument();
  });
});
