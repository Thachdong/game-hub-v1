import MockAdapter from "axios-mock-adapter";
import { describe, expect, it } from "vitest";
import { createHttpClient } from "./http-client.js";
import { withServiceResult } from "./with-service-result.js";

function makeClient(onUnauthenticated: () => Promise<string | null> = async () => null) {
  const client = createHttpClient({
    baseURL: "https://api.test",
    getAccessToken: () => "test-token",
    onUnauthenticated,
  });
  const mock = new MockAdapter(client);
  return { client, mock };
}

describe("withServiceResult", () => {
  it("normalizes a 200 response into a ServiceSuccess", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/things/1").reply(200, { statusCode: 200, message: "ok", data: { id: "1" } });

    const call = withServiceResult(client, {
      method: "GET",
      buildRequest: (input: { id: string }) => ({ url: `/things/${input.id}` }),
      mapResponse: (data: unknown) => data as { id: string },
    });

    expect(await call({ id: "1" })).toEqual({
      ok: true,
      data: { id: "1" },
      statusCode: 200,
      message: "ok",
    });
  });

  it.each([
    [400, "VALIDATION"],
    [401, "UNAUTHENTICATED"],
    [403, "UNAUTHORIZED"],
    [404, "NOT_FOUND"],
    [500, "SERVER_ERROR"],
  ] as const)("maps a %i response to reason %s", async (status, reason) => {
    const { client, mock } = makeClient();
    mock.onPost("/things").reply(status, { message: "failed" });

    const call = withServiceResult(client, {
      method: "POST",
      buildRequest: () => ({ url: "/things" }),
      mapResponse: (data: unknown) => data,
    });

    const result = await call(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe(reason);
      expect(result.statusCode).toBe(status);
    }
  });

  it("surfaces fieldErrors on VALIDATION failures", async () => {
    const { client, mock } = makeClient();
    mock
      .onPost("/things")
      .reply(400, { message: "invalid", fieldErrors: { name: ["required"] } });

    const call = withServiceResult(client, {
      method: "POST",
      buildRequest: () => ({ url: "/things" }),
      mapResponse: (data: unknown) => data,
    });

    const result = await call(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toEqual({ name: ["required"] });
    }
  });

  it("normalizes a 204 No Content response into ServiceSuccess with undefined data", async () => {
    const { client, mock } = makeClient();
    mock.onDelete("/things/1").reply(204);

    const call = withServiceResult(client, {
      method: "DELETE",
      buildRequest: () => ({ url: "/things/1" }),
      mapResponse: (data: unknown) => data,
    });

    const result = await call(undefined);
    expect(result).toEqual({ ok: true, data: undefined, statusCode: 204, message: "" });
  });

  it("reports NETWORK_ERROR when the request never reaches the server", async () => {
    const { client, mock } = makeClient();
    mock.onGet("/things/1").networkError();

    const call = withServiceResult(client, {
      method: "GET",
      buildRequest: () => ({ url: "/things/1" }),
      mapResponse: (data: unknown) => data,
    });

    const result = await call(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("NETWORK_ERROR");
    }
  });
});
