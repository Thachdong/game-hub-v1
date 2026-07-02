import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry.js";

function networkError() {
  return Object.assign(new Error("Network Error"), { isAxiosError: true, response: undefined });
}

function serverError(status = 503) {
  return Object.assign(new Error("Server Error"), { isAxiosError: true, response: { status } });
}

describe("withRetry", () => {
  it("retries a GET up to 2 times on NETWORK_ERROR before succeeding", async () => {
    let attempts = 0;
    const execute = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) throw networkError();
      return "ok";
    });

    await expect(withRetry("GET", execute)).resolves.toBe("ok");
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("retries a GET exactly 2 times on SERVER_ERROR then gives up", async () => {
    const execute = vi.fn(async () => {
      throw serverError(500);
    });

    await expect(withRetry("GET", execute)).rejects.toThrow();
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)(
    "never retries a %s request on a transient failure",
    async (method) => {
      const execute = vi.fn(async () => {
        throw networkError();
      });

      await expect(withRetry(method, execute)).rejects.toThrow();
      expect(execute).toHaveBeenCalledTimes(1);
    }
  );

  it("does not retry a GET on a non-transient failure (e.g. 404)", async () => {
    const execute = vi.fn(async () => {
      throw serverError(404);
    });

    await expect(withRetry("GET", execute)).rejects.toThrow();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
