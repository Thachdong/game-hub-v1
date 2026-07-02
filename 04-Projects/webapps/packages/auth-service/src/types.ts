export interface Account {
  id: string;
  email: string;
  username: string;
  avatarUrl: string;
}

export interface GoogleCallbackParams {
  code: string;
  state?: string;
}

export interface ExchangeGoogleCallbackResult {
  accessToken: string;
  account: Account;
  /** Route Handler must set this on its Set-Cookie response header (httpOnly, Secure, SameSite=Strict). */
  refreshTokenCookieValue: string;
}
