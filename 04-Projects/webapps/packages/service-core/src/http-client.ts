import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const DEFAULT_TIMEOUT_MS = 10_000;

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

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retriedAfterUnauthenticated?: boolean;
}

/** Creates one axios instance per domain package; instances are not shared across packages. */
export function createHttpClient(config: HttpClientConfig): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  instance.interceptors.request.use((requestConfig) => {
    const token = config.getAccessToken();
    if (token) {
      requestConfig.headers.set("Authorization", `Bearer ${token}`);
    }
    return requestConfig;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as RetryableRequestConfig | undefined;
      const status = error.response?.status;
      const hadToken = Boolean(originalRequest && config.getAccessToken());

      if (
        status === 401 &&
        hadToken &&
        originalRequest &&
        !originalRequest._retriedAfterUnauthenticated
      ) {
        originalRequest._retriedAfterUnauthenticated = true;
        const newToken = await config.onUnauthenticated();
        if (newToken) {
          originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
          return instance(originalRequest);
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
}
