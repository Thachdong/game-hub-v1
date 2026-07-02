import { createHttpClient, type HttpClientConfig } from "@game-hub/service-core";

type ConfigOverrides = Partial<HttpClientConfig>;

let overrides: ConfigOverrides = {};
let cachedClient: ReturnType<typeof createHttpClient> | undefined;

function defaultBaseUrl(): string {
  return (
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_GAME_HUB_API_BASE_URL : undefined) ??
    ""
  );
}

/**
 * Wires this package's http client to the app's session state. Call once at app startup (or
 * before first use in tests); safe to call again — the next call rebuilds the client.
 */
export function configureProfilesService(config: ConfigOverrides): void {
  overrides = { ...overrides, ...config };
  cachedClient = undefined;
}

export function getClient(): ReturnType<typeof createHttpClient> {
  if (!cachedClient) {
    cachedClient = createHttpClient({
      baseURL: overrides.baseURL ?? defaultBaseUrl(),
      getAccessToken: overrides.getAccessToken ?? (() => null),
      onUnauthenticated: overrides.onUnauthenticated ?? (async () => null),
      timeoutMs: overrides.timeoutMs,
    });
  }
  return cachedClient;
}
