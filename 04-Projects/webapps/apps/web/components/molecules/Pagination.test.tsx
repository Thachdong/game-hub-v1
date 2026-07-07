import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("shows the current page out of the total computed from total/pageSize", () => {
    render(<Pagination page={2} pageSize={20} total={37} onPageChange={vi.fn()} />);

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("disables Prev on the first page", () => {
    render(<Pagination page={1} pageSize={20} total={37} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
  });

  it("disables Next on the last page", () => {
    render(<Pagination page={2} pageSize={20} total={37} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("calls onPageChange with the next page number", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageSize={20} total={37} onPageChange={onPageChange} />);

    screen.getByRole("button", { name: "Next" }).click();

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
