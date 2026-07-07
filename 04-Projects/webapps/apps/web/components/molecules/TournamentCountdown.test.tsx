import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TournamentCountdown } from "./TournamentCountdown";

const NOW = new Date("2026-01-01T00:00:00.000Z").getTime();

describe("TournamentCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down to startAt while the tournament is still waiting (FR-001a)", () => {
    render(
      <TournamentCountdown
        status="waiting"
        startAt={new Date(NOW + 70_000).toISOString()}
        endAt={new Date(NOW + 3_670_000).toISOString()}
      />
    );

    expect(screen.getByText("Starts in 1m 10s")).toBeInTheDocument();
  });

  it("counts down to endAt once the tournament is in progress (FR-001)", () => {
    render(
      <TournamentCountdown
        status="in_progress"
        startAt={new Date(NOW - 10_000).toISOString()}
        endAt={new Date(NOW + 130_000).toISOString()}
      />
    );

    expect(screen.getByText("Ends in 2m 10s")).toBeInTheDocument();
  });

  it("shows a static ended state with no ticking countdown once the tournament has ended", () => {
    render(
      <TournamentCountdown
        status="ended"
        startAt={new Date(NOW - 100_000).toISOString()}
        endAt={new Date(NOW - 10_000).toISOString()}
      />
    );

    expect(screen.getByText("Tournament ended")).toBeInTheDocument();
  });

  it("shows a static cancelled state", () => {
    render(
      <TournamentCountdown
        status="cancelled"
        startAt={new Date(NOW - 100_000).toISOString()}
        endAt={new Date(NOW - 10_000).toISOString()}
      />
    );

    expect(screen.getByText("Tournament cancelled")).toBeInTheDocument();
  });
});
