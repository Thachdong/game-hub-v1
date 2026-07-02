// accountId1 is always the lexicographically smaller UUID.
// Invariant enforced by use-case before insert to prevent duplicate (A,B) and (B,A) rows.
export class Friendship {
  id: string;
  accountId1: string;
  accountId2: string;
  createdAt: Date;
}
