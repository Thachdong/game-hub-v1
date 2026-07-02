// Only client.ts + shared types are exported here — never bff.ts, so server-only code (which
// handles the refresh token) can't be bundled into client code. Import `@game-hub/auth-service/bff`
// from a server-only context (e.g. a Next.js Route Handler) instead.
export {
  getAccessToken,
  getGoogleLoginUrl,
  handleSessionRefresh,
  logout,
  refreshSession,
  setAccessToken,
} from "./client.js";
export { configureAuthService } from "./config.js";
export type { Account, ExchangeGoogleCallbackResult, GoogleCallbackParams } from "./types.js";
