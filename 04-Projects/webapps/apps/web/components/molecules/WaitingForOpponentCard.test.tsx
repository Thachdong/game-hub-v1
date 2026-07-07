import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WaitingForOpponentCard } from "./WaitingForOpponentCard";

describe("WaitingForOpponentCard", () => {
  it("renders a waiting-for-opponent placeholder", () => {
    render(<WaitingForOpponentCard />);

    expect(screen.getByText("Waiting for opponent…")).toBeInTheDocument();
  });
});
