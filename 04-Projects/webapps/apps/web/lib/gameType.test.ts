import { describe, expect, it } from "vitest";
import { formatGameType } from "./gameType";

describe("formatGameType", () => {
  it.each([
    ["18x18", 5, "18×18 · 5s/move"],
    ["25x25", 15, "25×25 · 15s/move"],
    ["40x40", 60, "40×40 · 60s/move"],
  ] as const)("formats %s / %ss into %s", (boardSize, moveTimeSeconds, expected) => {
    expect(formatGameType(boardSize, moveTimeSeconds)).toBe(expected);
  });
});
