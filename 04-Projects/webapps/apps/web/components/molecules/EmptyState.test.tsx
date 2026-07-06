import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the given message text", () => {
    render(<EmptyState message="No games available" />);

    expect(screen.getByText("No games available")).toBeInTheDocument();
  });
});
