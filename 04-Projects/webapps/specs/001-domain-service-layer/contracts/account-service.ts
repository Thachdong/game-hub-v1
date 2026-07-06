/**
 * Contract for `@game-hub/account-service`. Covers FR-008, FR-009.
 */

import type { ServiceResult } from "./service-core";

export interface Account {
  id: string;
  email: string;
  username: string;
  avatarUrl: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  hasProfile?: boolean;
}

/** GET /api/accounts/me */
export declare function getCurrentAccount(): Promise<ServiceResult<Account>>;

/** GET /api/games */
export declare function listGames(): Promise<ServiceResult<Game[]>>;
