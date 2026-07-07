import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, type BadgeVariant } from "./Badge";

describe("Badge", () => {
  it.each([
    ["1st", "#1"],
    ["2nd", "#2"],
    ["3rd", "#3"],
    ["you", "You"],
  ] as [BadgeVariant, string][])("renders the %s variant's label", (variant, label) => {
    render(<Badge variant={variant} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
