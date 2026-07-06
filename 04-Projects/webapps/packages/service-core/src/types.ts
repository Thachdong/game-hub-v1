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
