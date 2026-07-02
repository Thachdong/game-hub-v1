import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getMyTrustScore } from "./trust-score.js";
import { configureProfilesService, getClient } from "./http-client.js";

describe("trust-score", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureProfilesService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("normalizes gameLocked/gameLockedUntil to locked/lockedUntil", async () => {
    mock.onGet("/api/trust-score/me").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        score: 80,
        gameLocked: true,
        gameLockedUntil: "2026-02-01T00:00:00.000Z",
        lastRecoveryDate: "2026-01-15",
        updatedAt: "2026-01-30T00:00:00.000Z",
      },
    });

    const result = await getMyTrustScore();
    expect(result).toEqual({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: {
        score: 80,
        locked: true,
        lockedUntil: "2026-02-01T00:00:00.000Z",
        lastRecoveryDate: "2026-01-15",
        updatedAt: "2026-01-30T00:00:00.000Z",
      },
    });
  });
});
