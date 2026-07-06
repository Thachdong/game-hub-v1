import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listReportTypes, submitReport } from "./reports.js";
import { configureProfilesService, getClient } from "./http-client.js";

describe("reports", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    configureProfilesService({ baseURL: "https://api.test", getAccessToken: () => "token" });
    mock = new MockAdapter(getClient());
  });

  afterEach(() => mock.restore());

  it("listReportTypes unwraps the `items` envelope into a plain array", async () => {
    mock.onGet("/api/report-types").reply(200, {
      statusCode: 200,
      message: "ok",
      data: { items: [{ id: "rt1", name: "cheating" }] },
    });

    const result = await listReportTypes();
    expect(result).toEqual({
      ok: true,
      statusCode: 200,
      message: "ok",
      data: [{ id: "rt1", name: "cheating" }],
    });
  });

  it("submitReport posts the report payload and maps SubmitReportResponseDto", async () => {
    mock
      .onPost("/api/reports", { reportedUserId: "u2", reportTypeId: "rt1", context: "cheated" })
      .reply(201, {
        statusCode: 201,
        message: "ok",
        data: {
          id: "rep-1",
          reportedUserId: "u2",
          reportTypeId: "rt1",
          context: "cheated",
          status: "pending",
          submittedAt: "2026-01-01T00:00:00.000Z",
        },
      });

    const result = await submitReport({ reportedUserId: "u2", reportTypeId: "rt1", context: "cheated" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe("pending");
  });
});
