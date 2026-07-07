import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LeaderboardEntryRow } from "./LeaderboardEntryRow";

describe("LeaderboardEntryRow", () => {
  it("renders the display name, elo, and a placeholder avatar when avatarUrl is null (pending backend)", () => {
    render(
      <LeaderboardEntryRow
        rank={4}
        displayName="Player abc123"
        avatarUrl={null}
        elo={1500}
        highlight={null}
        isSelf={false}
      />
    );

    expect(screen.getByText("Player abc123")).toBeInTheDocument();
    expect(screen.getByText("1500")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Player abc123" })).toHaveAttribute(
      "src",
      expect.stringContaining("data:image/svg+xml")
    );
    expect(screen.queryByText(/#\d/)).not.toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
  });

  it("renders a rank badge for top-3 entries", () => {
    render(
      <LeaderboardEntryRow rank={1} displayName="Alice" avatarUrl="https://a" elo={2000} highlight="1st" isSelf={false} />
    );

    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it('renders a "You" badge when isSelf is true', () => {
    render(
      <LeaderboardEntryRow rank={7} displayName="Bob" avatarUrl="https://b" elo={1200} highlight={null} isSelf={true} />
    );

    expect(screen.getByText("You")).toBeInTheDocument();
  });
});
