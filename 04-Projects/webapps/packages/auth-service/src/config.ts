// Internal, package-local configuration. Not part of the public contract — every domain package
// needs a runtime-configurable backend base URL and no `apps/*` webapp exists yet to inject one,
// so each package exposes its own `configure*` override (defaults come from a NEXT_PUBLIC_ env
// var, which Next.js inlines into client bundles at build time).

let apiBaseUrl =
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_GAME_HUB_API_BASE_URL : undefined) ??
  "";
let proxyBasePath = "/api/auth";

export function configureAuthService(config: { apiBaseUrl?: string; proxyBasePath?: string }): void {
  if (config.apiBaseUrl !== undefined) apiBaseUrl = config.apiBaseUrl;
  if (config.proxyBasePath !== undefined) proxyBasePath = config.proxyBasePath;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function getProxyBasePath(): string {
  return proxyBasePath;
}
