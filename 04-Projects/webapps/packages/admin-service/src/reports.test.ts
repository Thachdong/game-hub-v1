import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  confirmReport,
  createReportType,
  listReportsForModeration,
  listReportTypesAdmin,
  updateReportType,
} from "./reports.js";
import { configureAdminService, getClient } from "./http-client.js";

describe("admin reports", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureAdminService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("listReportsForModeration returns a CursorPage of AdminReportEntry", async () => {
    mock.onGet("/api/admin/reports").reply(200, {
      statusCode: 200,
      message: "ok",
      data: { items: [], nextCursor: null },
    });

    const result = await listReportsForModeration();
    expect(result).toEqual({ ok: true, statusCode: 200, message: "ok", data: { items: [], nextCursor: null } });
  });

  it("listReportsForModeration returns UNAUTHORIZED for a non-admin access token", async () => {
    mock.onGet("/api/admin/reports").reply(403, { message: "Forbidden — not a Platform Admin" });

    const result = await listReportsForModeration();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("UNAUTHORIZED");
  });

  it("confirmReport sends the decision and maps the embedded trust score snapshot", async () => {
    mock.onPatch("/api/admin/reports/rep-1/confirm", { decision: "valid" }).reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        id: "rep-1",
        status: "valid",
        appliedPoints: 20,
        resolvedAt: "2026-01-01T00:00:00.000Z",
        resolvedBy: "admin-1",
        reportedUserTrustScore: { score: 60, locked: false, lockedUntil: null },
      },
    });

    const result = await confirmReport({ id: "rep-1", decision: "valid" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.reportedUserTrustScore?.score).toBe(60);
  });

  it("listReportTypesAdmin unwraps the `items` envelope into a plain array", async () => {
    mock.onGet("/api/admin/report-types").reply(200, {
      statusCode: 200,
      message: "ok",
      data: {
        items: [
          {
            id: "rt1",
            name: "cheating",
            deductionPoints: 20,
            active: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    });

    const result = await listReportTypesAdmin();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("createReportType posts name/deductionPoints", async () => {
    mock
      .onPost("/api/admin/report-types", { name: "griefing", deductionPoints: 15 })
      .reply(201, {
        statusCode: 201,
        message: "ok",
        data: {
          id: "rt2",
          name: "griefing",
          deductionPoints: 15,
          active: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      });

    const result = await createReportType({ name: "griefing", deductionPoints: 15 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("griefing");
  });

  it("updateReportType sends only the provided partial fields", async () => {
    mock.onPatch("/api/admin/report-types/rt1").reply((config) => {
      expect(JSON.parse(config.data)).toEqual({ active: false });
      return [
        200,
        {
          statusCode: 200,
          message: "ok",
          data: {
            id: "rt1",
            name: "cheating",
            deductionPoints: 20,
            active: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
          },
        },
      ];
    });

    const result = await updateReportType({ id: "rt1", active: false });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.active).toBe(false);
  });
});
