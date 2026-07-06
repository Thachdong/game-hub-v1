import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoginCard } from "./LoginCard";

describe("LoginCard", () => {
  it("shows no error message when no ?error= is present", () => {
    render(<LoginCard />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });

  it("renders the declined/cancelled branch for Google's access_denied error (FR-011)", () => {
    render(<LoginCard error="access_denied" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/cancelled/i);
  });

  it("renders the system-error branch for a backend oauth_failed error (FR-011)", () => {
    render(<LoginCard error="oauth_failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/went wrong/i);
  });

  it("renders a distinguishable message for the two error branches", () => {
    const { unmount } = render(<LoginCard error="access_denied" />);
    const declinedText = screen.getByRole("alert").textContent;
    unmount();

    render(<LoginCard error="oauth_failed" />);
    const systemErrorText = screen.getByRole("alert").textContent;

    expect(declinedText).not.toBe(systemErrorText);
  });
});
