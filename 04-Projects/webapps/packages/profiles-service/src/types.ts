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

// --- Notifications -----------------------------------------------------------

export interface Notification {
  id: string;
  type: "friend-or-game-invite" | "tournament-event" | "admin-warning" | "trust-score-alert";
  content: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

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
