export type GoogleUserInfo = {
  email: string;
  name: string;
  avatarUrl: string;
};

export interface IGoogleOAuthPort {
  getProfile(accessToken: string): Promise<GoogleUserInfo>;
}

export const GOOGLE_OAUTH_PORT = Symbol('GOOGLE_OAUTH_PORT');
