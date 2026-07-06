import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Providers, useAuthSession } from "./Providers";

function Consumer() {
  const { isSignedIn, account, refresh, logout } = useAuthSession();
  return (
    <div>
      <span data-testid="status">{isSignedIn ? `signed-in:${account?.username}` : "signed-out"}</span>
      <button onClick={() => refresh()}>refresh</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("Providers / useAuthSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seeds context with the initial server-rendered session", () => {
    render(
      <Providers session={{ isSignedIn: true, account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" } }}>
        <Consumer />
      </Providers>
    );

    expect(screen.getByTestId("status").textContent).toBe("signed-in:alice");
  });

  it("refresh() re-fetches /api/auth/session and updates context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ isSignedIn: true, account: { id: "2", email: "b@b.com", username: "bob", avatarUrl: "https://b" } }),
      })
    );

    render(
      <Providers session={{ isSignedIn: false }}>
        <Consumer />
      </Providers>
    );
    expect(screen.getByTestId("status").textContent).toBe("signed-out");

    fireEvent.click(screen.getByText("refresh"));

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("signed-in:bob"));
    expect(fetch).toHaveBeenCalledWith("/api/auth/session");
  });

  it("logout() calls POST /api/auth/logout and resets context to signed-out", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({}) }));

    render(
      <Providers session={{ isSignedIn: true, account: { id: "1", email: "a@b.com", username: "alice", avatarUrl: "https://a" } }}>
        <Consumer />
      </Providers>
    );

    fireEvent.click(screen.getByText("logout"));

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("signed-out"));
    expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });
});
