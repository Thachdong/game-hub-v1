import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cancelQuickPair, requestQuickPair } from "./quick-pair.js";
import { configureCaroService, getClient } from "./http-client.js";

describe("quick-pair", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureCaroService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("requestQuickPair posts configId and maps the waiting/matched result", async () => {
    mock.onPost("/api/caro/quick-pair", { configId: "cfg1" }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: { status: "waiting", requestId: "req1", matchId: null },
    });

    const result = await requestQuickPair({ configId: "cfg1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("waiting");
  });

  it("cancelQuickPair handles a 204/empty response", async () => {
    mock.onDelete("/api/caro/quick-pair").reply(204);

    const result = await cancelQuickPair();
    expect(result).toEqual({ ok: true, data: undefined, statusCode: 204, message: "" });
  });
});
