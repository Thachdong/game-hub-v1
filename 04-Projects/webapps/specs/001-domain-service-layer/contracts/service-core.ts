/**
 * Contract for `@game-hub/service-core`.
 *
 * Shared by every domain package (auth, account, profiles, admin, game-caro). This is the only
 * package the five domain packages are allowed to depend on besides each other's public types —
 * see plan.md Constitution Check for why this shared package doesn't violate the "Rule of Two".
 *
 * This file declares the PUBLIC CONTRACT ONLY — no implementation bodies. Implementation happens
 * during /speckit-tasks + /speckit-implement.
 */

// ---------------------------------------------------------------------------
// Uniform response shape (FR-001, FR-002)
// ---------------------------------------------------------------------------

export type ServiceErrorReason =
  | "UNAUTHENTICATED" // no/invalid/expired access token, refresh also failed
  | "UNAUTHORIZED" // valid session, insufficient permissions (403)
  | "VALIDATION" // 400 — malformed/invalid input
  | "NOT_FOUND" // 404
  | "SERVER_ERROR" // 5xx, or any 4xx not otherwise classified
  | "NETWORK_ERROR"; // request never reached the server: timeout, DNS, connection reset

export interface ServiceSuccess<T> {
  ok: true;
  data: T;
  statusCode: number;
  message: string;
}

export interface ServiceFailure {
  ok: false;
  reason: ServiceErrorReason;
  statusCode: number;
  message: string;
  /** Present only when reason === 'VALIDATION' and the backend returned field-level detail. */
  fieldErrors?: Record<string, string[]>;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

// ---------------------------------------------------------------------------
// Pagination (only for endpoints that actually paginate — see data-model.md)
// ---------------------------------------------------------------------------

export interface Cursor {
  createdAt: string;
  id: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: Cursor | null;
}

// ---------------------------------------------------------------------------
// HTTP client factory
// ---------------------------------------------------------------------------

export interface HttpClientConfig {
  baseURL: string;
  /** Returns the current in-memory access token, or null if unauthenticated. */
  getAccessToken: () => string | null;
  /**
   * Called on a 401 from a request that had a token attached. Must resolve with the new access
   * token on success, or null if the session could not be renewed (caller then reports
   * UNAUTHENTICATED). Implemented by the auth-service package's `refreshSession`.
   */
  onUnauthenticated: () => Promise<string | null>;
  timeoutMs?: number; // default 10_000, see research.md §9
}

/** Creates one axios instance per domain package; instances are not shared across packages. */
export declare function createHttpClient(config: HttpClientConfig): unknown; // AxiosInstance

// ---------------------------------------------------------------------------
// The HOF that normalizes any request into a ServiceResult ("HOC/HOF" requirement)
// ---------------------------------------------------------------------------

export interface RequestSpec<TInput, TOutput> {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Builds the request path/params/body from the typed input. */
  buildRequest: (input: TInput) => {
    url: string;
    params?: Record<string, unknown>;
    body?: unknown;
  };
  /** Maps the backend's ApiResponseDto.data payload into this package's output type. */
  mapResponse: (data: unknown) => TOutput;
}

/**
 * Higher-order function: given an http client and a RequestSpec, returns a bound, typed service
 * function `(input: TInput) => Promise<ServiceResult<TOutput>>`.
 *
 * GET requests get the transient-failure auto-retry policy (research.md §6); mutating methods do
 * not.
 */
export declare function withServiceResult<TInput, TOutput>(
  client: unknown, // AxiosInstance from createHttpClient
  spec: RequestSpec<TInput, TOutput>
): (input: TInput) => Promise<ServiceResult<TOutput>>;
