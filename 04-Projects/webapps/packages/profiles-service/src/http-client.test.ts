import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listFriends } from "./friends.js";
import { configureProfilesService, getClient } from "./http-client.js";

// Proves the client-side "point this package at the proxy" wiring pattern
// (specs/005-auth-proxy-refactor/research.md §5, contracts/proxy-routes.md) works identically to
// account-service's, without any profiles-service-specific change: baseURL points at the
// same-origin proxy prefix and getAccessToken always returns null, since the proxy route itself
// — not this package — attaches the real bearer token server-side.
describe("profiles-service: proxy-pointed client wiring (US3)", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureProfilesService({ baseURL: "/api/proxy", getAccessToken: () => null });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("succeeds against the proxy prefix with no Authorization header attached", async () => {
    mock.onGet("/api/friends").reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, { statusCode: 200, message: "ok", data: { friends: [] } }];
    });

    const result = await listFriends();

    expect(result).toEqual({ ok: true, statusCode: 200, message: "ok", data: [] });
    expect(getClient().defaults.baseURL).toBe("/api/proxy");
  });
});
