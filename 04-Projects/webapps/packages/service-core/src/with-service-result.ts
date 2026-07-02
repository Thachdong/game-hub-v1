import axios, { AxiosInstance } from "axios";
import { withRetry } from "./retry.js";
import { ServiceFailure, ServiceResult } from "./types.js";

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

interface ApiResponseEnvelope {
  statusCode: number;
  message: string;
  data: unknown;
}

interface BackendErrorBody {
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

function mapAxiosErrorToFailure(error: unknown): ServiceFailure {
  if (!axios.isAxiosError(error) || !error.response) {
    return {
      ok: false,
      reason: "NETWORK_ERROR",
      statusCode: 0,
      message: axios.isAxiosError(error) ? error.message : "Network error",
    };
  }

  const status = error.response.status;
  const body = error.response.data as BackendErrorBody | undefined;
  const message = body?.message ?? error.message;

  switch (status) {
    case 401:
      return { ok: false, reason: "UNAUTHENTICATED", statusCode: status, message };
    case 403:
      return { ok: false, reason: "UNAUTHORIZED", statusCode: status, message };
    case 400:
      return {
        ok: false,
        reason: "VALIDATION",
        statusCode: status,
        message,
        ...(body?.fieldErrors ? { fieldErrors: body.fieldErrors } : {}),
      };
    case 404:
      return { ok: false, reason: "NOT_FOUND", statusCode: status, message };
    default:
      return { ok: false, reason: "SERVER_ERROR", statusCode: status, message };
  }
}

/**
 * Higher-order function: given an http client and a RequestSpec, returns a bound, typed service
 * function `(input: TInput) => Promise<ServiceResult<TOutput>>`.
 *
 * GET requests get the transient-failure auto-retry policy (research.md §6); mutating methods do
 * not.
 */
export function withServiceResult<TInput, TOutput>(
  client: AxiosInstance,
  spec: RequestSpec<TInput, TOutput>
): (input: TInput) => Promise<ServiceResult<TOutput>> {
  return async (input: TInput): Promise<ServiceResult<TOutput>> => {
    const { url, params, body } = spec.buildRequest(input);

    try {
      const response = await withRetry(spec.method, () =>
        client.request<ApiResponseEnvelope>({ method: spec.method, url, params, data: body })
      );

      // A 204 (or otherwise empty body) never carries an ApiResponseDto envelope to unwrap —
      // some backend DELETE endpoints document one despite the spec's declared output type.
      if (response.status === 204 || !response.data) {
        return {
          ok: true,
          data: undefined as TOutput,
          statusCode: response.status,
          message: "",
        };
      }

      return {
        ok: true,
        data: spec.mapResponse(response.data.data),
        statusCode: response.data.statusCode,
        message: response.data.message,
      };
    } catch (error) {
      return mapAxiosErrorToFailure(error);
    }
  };
}
