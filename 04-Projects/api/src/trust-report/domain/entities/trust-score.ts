export class TrustScore {
  accountId: string;
  score: number;
  gameLockedUntil: Date | null;
  lastRecoveryDate: string | null;
  updatedAt: Date;
}
