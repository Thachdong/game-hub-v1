import { describe, expect, it } from "vitest";
import { getGameLinkTarget } from "./game-routes.js";

describe("getGameLinkTarget", () => {
  it("derives entryPath and profilePath from the game's slug", () => {
    expect(getGameLinkTarget({ slug: "caro" })).toEqual({
      entryPath: "/game-caro",
      profilePath: "/game-caro/profile",
    });
  });
});
