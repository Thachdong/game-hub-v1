import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthSession } from "@/components/templates/Providers";
import { usePathname, useRouter } from "next/navigation";

const listReportTypesActionMock = vi.fn();
const submitReportActionMock = vi.fn();

vi.mock("@/lib/actions/profiles", () => ({
  listReportTypesAction: listReportTypesActionMock,
  submitReportAction: submitReportActionMock,
}));

vi.mock("@/components/templates/Providers", () => ({
  useAuthSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const mockedUseAuthSession = vi.mocked(useAuthSession);
const mockedUseRouter = vi.mocked(useRouter);
const mockedUsePathname = vi.mocked(usePathname);

const { ReportPlayerForm } = await import("./ReportPlayerForm.js");

describe("ReportPlayerForm", () => {
  it("redirects a guest to login instead of opening the form", () => {
    mockedUseAuthSession.mockReturnValue({ isSignedIn: false, refresh: vi.fn(), logout: vi.fn() });
    const push = vi.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");

    render(<ReportPlayerForm reportedUserId="opponent1" />);
    screen.getByRole("button", { name: /report/i }).click();

    expect(push).toHaveBeenCalledWith("/login?callbackUrl=%2Fgame-caro%2Fm1");
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });

  it("opens the form and submits a report for a signed-in viewer", async () => {
    mockedUseAuthSession.mockReturnValue({
      isSignedIn: true,
      account: { id: "u1", email: "a@b.com", username: "alice", avatarUrl: "" },
      refresh: vi.fn(),
      logout: vi.fn(),
    });
    mockedUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    mockedUsePathname.mockReturnValue("/game-caro/m1");
    listReportTypesActionMock.mockResolvedValue({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: [{ id: "rt1", name: "Cheating" }],
    });
    submitReportActionMock.mockResolvedValue({ ok: true, statusCode: 201, message: "ok", data: {} });

    render(<ReportPlayerForm reportedUserId="opponent1" />);
    fireEvent.click(screen.getByRole("button", { name: /report/i }));

    await waitFor(() => expect(screen.getByRole("option", { name: "Cheating" })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/details/i), { target: { value: "they cheated" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(submitReportActionMock).toHaveBeenCalledWith({
        reportedUserId: "opponent1",
        reportTypeId: "rt1",
        context: "they cheated",
      })
    );
  });
});
