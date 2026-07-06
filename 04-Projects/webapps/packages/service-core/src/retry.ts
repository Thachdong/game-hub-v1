import axios from "axios";

const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 300;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function isTransientAxiosError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  if (!error.response) {
    return true; // request never reached the server: timeout, DNS, connection reset
  }
  return error.response.status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a GET request up to `MAX_RETRIES` extra times with exponential backoff (300ms, 600ms)
 * when the failure is transient (network error or 5xx). Mutating methods are never retried here
 * — several are not safe to repeat blindly on an ambiguous network failure (research.md §6).
 */
export async function withRetry<T>(method: HttpMethod, execute: () => Promise<T>): Promise<T> {
  if (method !== "GET") {
    return execute();
  }

  let attempt = 0;
  for (;;) {
    try {
      return await execute();
    } catch (error) {
      if (attempt >= MAX_RETRIES || !isTransientAxiosError(error)) {
        throw error;
      }
      const backoffMs = INITIAL_BACKOFF_MS * 2 ** attempt;
      await delay(backoffMs);
      attempt += 1;
    }
  }
}
