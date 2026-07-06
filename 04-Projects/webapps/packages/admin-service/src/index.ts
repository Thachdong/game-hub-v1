export { assignGameAdmin, removeGameAdmin } from "./game-admins.js";
export { configureAdminService } from "./http-client.js";
export {
  confirmReport,
  createReportType,
  listReportsForModeration,
  listReportTypesAdmin,
  updateReportType,
} from "./reports.js";
export type {
  AdminAssignment,
  AdminReportEntry,
  AdminReportType,
  ConfirmReportResult,
  TrustScoreSnapshot,
} from "./types.js";
