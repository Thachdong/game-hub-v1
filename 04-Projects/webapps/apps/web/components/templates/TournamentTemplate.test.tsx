import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TournamentTemplate } from "./TournamentTemplate";

describe("TournamentTemplate", () => {
  it("renders the header above the standings body", () => {
    render(
      <TournamentTemplate
        header={<span>Ends in 1m 0s</span>}
        standings={<span>Standings body</span>}
      />
    );

    expect(screen.getByText("Ends in 1m 0s")).toBeInTheDocument();
    expect(screen.getByText("Standings body")).toBeInTheDocument();
  });
});
