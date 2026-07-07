import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

const items = [
  { id: "lobby", label: "Lobby" },
  { id: "tournament", label: "Tournament" },
  { id: "quick-pair", label: "Quick Pair" },
];

describe("Tabs", () => {
  it("marks the active tab as selected and the others as not selected", () => {
    render(<Tabs items={items} activeId="tournament" onChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Tournament" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Lobby" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Quick Pair" })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange with the clicked tab's id", () => {
    const onChange = vi.fn();
    render(<Tabs items={items} activeId="lobby" onChange={onChange} />);

    fireEvent.click(screen.getByRole("tab", { name: "Quick Pair" }));

    expect(onChange).toHaveBeenCalledWith("quick-pair");
  });
});
