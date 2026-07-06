/**
 * Contract for `@game-hub/profiles-service`. Covers FR-010–FR-013 (friends, notifications,
 * reports, trust score).
 */

import type { CursorPage, ServiceResult } from "./service-core";

// --- Friends ---------------------------------------------------------------

export interface FriendRequestRecord {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface FriendRequestsList {
  incoming: FriendRequestRecord[];
  outgoing: FriendRequestRecord[];
}

export interface Friend {
  id: string;
  email: string;
  username: string;
  avatarUrl: string;
}

/** POST /api/friends/requests */
export declare function sendFriendRequest(input: {
  targetEmail: string;
}): Promise<ServiceResult<FriendRequestRecord>>;

/** GET /api/friends/requests */
export declare function listFriendRequests(): Promise<ServiceResult<FriendRequestsList>>;

/** PATCH /api/friends/requests/{id} */
export declare function resolveFriendRequest(input: {
  id: string;
  action: "accept" | "reject";
}): Promise<ServiceResult<FriendRequestRecord>>;

/** GET /api/friends */
export declare function listFriends(): Promise<ServiceResult<Friend[]>>;

// --- Notifications -----------------------------------------------------------

export interface Notification {
  id: string;
  type:
    | "friend-or-game-invite"
    | "tournament-event"
    | "admin-warning"
    | "trust-score-alert";
  content: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

/** GET /api/notifications */
export declare function listNotifications(input?: {
  cursor?: { createdAt: string; id: string };
}): Promise<ServiceResult<CursorPage<Notification>>>;

/** PATCH /api/notifications/{id}/read */
export declare function markNotificationRead(input: {
  id: string;
}): Promise<ServiceResult<Notification>>;

// --- Reports & Trust Score ---------------------------------------------------

export interface ReportType {
  id: string;
  name: string;
}

export interface Report {
  id: string;
  reportedUserId: string;
  reportTypeId: string;
  context: string;
  status: "pending" | "valid" | "invalid";
  submittedAt: string;
}

export interface TrustScore {
  score: number;
  locked: boolean;
  lockedUntil: string | null;
  lastRecoveryDate: string | null;
  updatedAt: string;
}

/** GET /api/report-types */
export declare function listReportTypes(): Promise<ServiceResult<ReportType[]>>;

/** POST /api/reports */
export declare function submitReport(input: {
  reportedUserId: string;
  reportTypeId: string;
  context: string;
}): Promise<ServiceResult<Report>>;

/** GET /api/trust-score/me */
export declare function getMyTrustScore(): Promise<ServiceResult<TrustScore>>;
