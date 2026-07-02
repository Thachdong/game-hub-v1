export const TRUST_STATUS_PORT = 'TRUST_STATUS_PORT';

export interface ITrustStatusPort {
  isLocked(accountId: string): Promise<{ locked: boolean; until: Date | null }>;
}
