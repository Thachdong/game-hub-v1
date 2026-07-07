import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameboardTemplate } from "./GameboardTemplate";

describe("GameboardTemplate", () => {
  it("renders both the board and side panel slots", () => {
    render(
      <GameboardTemplate board={<div>Board content</div>} sidePanel={<div>Side panel content</div>} />
    );

    expect(screen.getByText("Board content")).toBeInTheDocument();
    expect(screen.getByText("Side panel content")).toBeInTheDocument();
  });
});
