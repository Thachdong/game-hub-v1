export interface Account {
  id: string;
  email: string;
  username: string;
  avatarUrl: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  bannerUrl: string;
  hasProfile?: boolean;
}
